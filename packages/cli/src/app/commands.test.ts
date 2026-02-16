import { describe, expect, test } from "bun:test"
import type { CliAction, ProviderId } from "@minicode/sdk"
import { createCommandRouter } from "./commands"

type SessionHandle = {
  id: string
  provider: ProviderId
  model: string
}

function createCommandHarness(options: { active?: boolean; pluginActions?: CliAction[] } = {}) {
  const printed: string[] = []
  const openSessionCalls: unknown[] = []

  let session: SessionHandle = {
    id: "s1",
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
  }
  let active = options.active ?? false
  let abortCount = 0
  let exitCount = 0

  const providers = [
    {
      id: "openai" as const,
      models: ["gpt-4o-mini"],
    },
    {
      id: "anthropic" as const,
      models: ["claude-3-5-sonnet-latest", "claude-3-7-sonnet-latest"],
    },
    {
      id: "google" as const,
      models: ["gemini-2.5-flash"],
    },
    {
      id: "openai-compatible" as const,
      models: ["gpt-4o-mini"],
    },
  ]

  const router = createCommandRouter({
    sdk: {
      getRuntimeCatalog() {
        return {
          providers,
        }
      },

      getCliActions() {
        return options.pluginActions ?? []
      },

      async listSessions() {
        return [
          {
            id: session.id,
            cwd: "/tmp",
            provider: session.provider,
            model: session.model,
            createdAt: 1,
            updatedAt: 2,
          },
        ]
      },

      async openSession(input) {
        openSessionCalls.push(input)

        if (input?.id) {
          session = {
            ...session,
            id: input.id,
            model: input.runtime?.model ?? session.model,
          }

          return session as never
        }

        const runtimeProvider = input?.runtime?.provider ?? session.provider
        const runtimeModel =
          input?.runtime?.model ?? providers.find((provider) => provider.id === runtimeProvider)?.models[0]
        session = {
          id: `new-${openSessionCalls.length}`,
          provider: runtimeProvider,
          model: runtimeModel ?? session.model,
        }

        return session as never
      },
    },

    getSession: () => session,
    setSession(nextSession) {
      session = nextSession
    },
    print(text) {
      printed.push(text)
    },
    isTurnActive() {
      return active
    },
    abortActiveTurn() {
      if (!active) {
        return false
      }

      abortCount += 1
      active = false
      return true
    },
    requestExit() {
      exitCount += 1
    },
  })

  return {
    router,
    printed,
    openSessionCalls,
    getSession: () => session,
    setActive(value: boolean) {
      active = value
    },
    getAbortCount: () => abortCount,
    getExitCount: () => exitCount,
  }
}

describe("command router", () => {
  test("blocks idle-only commands while a turn is active", async () => {
    const harness = createCommandHarness({ active: true })

    await harness.router.handleSlashInput("/model claude-3-7-sonnet-latest")

    expect(harness.openSessionCalls.length).toBe(0)
    expect(harness.printed.join("")).toContain("requires idle state")
  })

  test("runs abort immediately while streaming", async () => {
    const harness = createCommandHarness({ active: true })

    await harness.router.handleSlashInput("/abort")

    expect(harness.getAbortCount()).toBe(1)
    expect(harness.printed.join("")).toContain("[abort] requested")
  })

  test("creates new session with provider and model override", async () => {
    const harness = createCommandHarness()

    await harness.router.handleSlashInput("/new --provider openai --model gpt-4o-mini")

    expect(harness.getSession().provider).toBe("openai")
    expect(harness.getSession().model).toBe("gpt-4o-mini")
    expect(harness.printed.join("")).toContain("[session:new]")
  })

  test("supports palette input through the same action path", async () => {
    const harness = createCommandHarness()

    await harness.router.handlePaletteInput("sessions")

    expect(harness.printed.join("")).toContain("[sessions]")
  })

  test("routes plugin actions through slash with shared execution context", async () => {
    const harness = createCommandHarness({
      pluginActions: [
        {
          id: "plugin-echo",
          title: "Plugin echo",
          description: "Echo args",
          aliases: ["pecho"],
          allowDuringTurn: true,
          async run(context) {
            context.print(`[plugin] ${context.args}\n`)
          },
          sourcePluginId: "demo.plugin",
          sourceReference: "demo-plugin",
        },
      ],
    })

    await harness.router.handleSlashInput("/plugin-echo hello world")

    expect(harness.printed.join("")).toContain("[plugin] hello world")
  })

  test("routes plugin action aliases through palette", async () => {
    const harness = createCommandHarness({
      pluginActions: [
        {
          id: "plugin-runtime",
          title: "Plugin runtime",
          aliases: ["pruntime"],
          allowDuringTurn: false,
          async run(context) {
            await context.switchRuntime({ model: "claude-3-7-sonnet-latest" })
          },
          sourcePluginId: "demo.plugin",
          sourceReference: "demo-plugin",
        },
      ],
    })

    await harness.router.handlePaletteInput("pruntime")

    expect(harness.getSession().model).toBe("claude-3-7-sonnet-latest")
  })

  test("isolates plugin action failures", async () => {
    const harness = createCommandHarness({
      pluginActions: [
        {
          id: "plugin-fail",
          title: "Plugin fail",
          aliases: [],
          allowDuringTurn: true,
          async run() {
            throw new Error("plugin blew up")
          },
          sourcePluginId: "demo.plugin",
          sourceReference: "demo-plugin",
        },
      ],
    })

    await harness.router.handleSlashInput("/plugin-fail")

    expect(harness.printed.join("")).toContain("plugin blew up")
  })

  test("provides abortTurn and switchSession helpers to plugin actions", async () => {
    const harness = createCommandHarness({
      active: true,
      pluginActions: [
        {
          id: "plugin-control",
          title: "Plugin control",
          aliases: [],
          allowDuringTurn: true,
          async run(context) {
            context.abortTurn()
            await context.switchSession({ createNew: true })
          },
          sourcePluginId: "demo.plugin",
          sourceReference: "demo-plugin",
        },
      ],
    })

    await harness.router.handleSlashInput("/plugin-control")

    expect(harness.getAbortCount()).toBe(1)
    expect(harness.getSession().id).toContain("new-")
  })

  test("fails fast on builtin and plugin command conflicts", () => {
    expect(() =>
      createCommandHarness({
        pluginActions: [
          {
            id: "model",
            title: "Conflicting action",
            aliases: [],
            allowDuringTurn: true,
            async run() {},
            sourcePluginId: "demo.plugin",
            sourceReference: "demo-plugin",
          },
        ],
      }),
    ).toThrow("Duplicate command id or alias")
  })
})
