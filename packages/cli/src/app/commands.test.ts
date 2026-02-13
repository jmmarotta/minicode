import { describe, expect, test } from "bun:test"
import type { ProviderId } from "@minicode/sdk"
import { createCommandRouter } from "./commands"

type SessionHandle = {
  id: string
  provider: ProviderId
  model: string
}

function createCommandHarness(options: { active?: boolean } = {}) {
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
})
