import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { MockLanguageModelV3, simulateReadableStream } from "ai/test"
import { createMinicode } from "./sdk"
import { createLanguageModel } from "./providers/factory"
import { ResolvedSdkConfigSchema, type ResolvedSdkConfig } from "./config/schema"

function createToolLoopMockModel(provider: string) {
  let streamCallCount = 0

  return new MockLanguageModelV3({
    provider,
    modelId: `${provider}-mock`,
    doStream: async () => {
      streamCallCount += 1

      if (streamCallCount === 1) {
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start", warnings: [] },
              {
                type: "tool-call",
                toolCallId: "call_read_1",
                toolName: "read",
                input: JSON.stringify({ filePath: "note.txt" }),
              },
              {
                type: "finish",
                finishReason: "tool-calls",
                usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
              },
            ],
          }),
        } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
      }

      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text_1" },
            { type: "text-delta", id: "text_1", delta: "done" },
            { type: "text-end", id: "text_1" },
            {
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            },
          ],
        }),
      } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
    },
  })
}

function createSessionTurnMockModel(provider: string) {
  let turnCount = 0

  return new MockLanguageModelV3({
    provider,
    modelId: `${provider}-session-mock`,
    doStream: async () => {
      turnCount += 1

      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: `text_${turnCount}` },
            { type: "text-delta", id: `text_${turnCount}`, delta: `reply-${turnCount}` },
            { type: "text-end", id: `text_${turnCount}` },
            {
              type: "finish",
              finishReason: "stop",
              usage: {
                inputTokens: 7,
                outputTokens: 3,
                totalTokens: 10,
              },
            },
          ],
        }),
      } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
    },
  })
}

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

describe("MINI-6 provider + tools + plugins", () => {
  test("provider factory resolves OpenAI and Anthropic models", () => {
    const baseConfig: ResolvedSdkConfig = ResolvedSdkConfigSchema.parse({
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
      apiKeys: {
        openai: "test-openai-key",
        anthropic: "test-anthropic-key",
      },
    })

    const openaiModel = createLanguageModel(baseConfig, {
      provider: "openai",
      model: "gpt-4o-mini",
    })

    const anthropicModel = createLanguageModel(baseConfig, {
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
    })

    expect(openaiModel.runtime.provider).toBe("openai")
    expect((openaiModel.model as { provider?: string }).provider).toContain("openai")
    expect(anthropicModel.runtime.provider).toBe("anthropic")
    expect((anthropicModel.model as { provider?: string }).provider).toContain("anthropic")
  })

  test("runs one tool call turn for OpenAI and Anthropic runtimes", async () => {
    const cwd = await createTempDirectory("minicode-sdk-tool-smoke-")

    try {
      await Bun.write(path.join(cwd, "note.txt"), "hello from tool")

      const globalConfigPath = path.join(cwd, "global-config.json")
      await Bun.write(
        globalConfigPath,
        JSON.stringify({
          provider: "anthropic",
          model: "claude-3-5-sonnet-latest",
          apiKeys: {
            openai: "test-openai-key",
            anthropic: "test-anthropic-key",
          },
          plugins: {},
        }),
      )

      const sdk = await createMinicode({
        cwd,
        env: {
          MINICODE_GLOBAL_CONFIG: globalConfigPath,
        },
        experimental_modelFactory: ({ runtime }) => createToolLoopMockModel(runtime.provider),
      })

      for (const provider of ["openai", "anthropic"] as const) {
        const turn = sdk.runTurn({
          request: { prompt: "read note" },
          runtime: {
            provider,
          },
        })

        const events = []
        for await (const event of turn.events) {
          events.push(event)
        }

        const response = await turn.response

        expect(events.some((event) => event.type === "tool_call")).toBe(true)
        expect(events.some((event) => event.type === "tool_result")).toBe(true)
        expect(events.some((event) => event.type === "finish")).toBe(true)

        const toolResultEvent = events.find((event) => event.type === "tool_result")
        expect(toolResultEvent && "output" in toolResultEvent ? toolResultEvent.output : undefined).toMatchObject({
          ok: true,
        })

        expect(response.text).toContain("done")
      }
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("loads package and file URL plugins from global config", async () => {
    const cwd = await createTempDirectory("minicode-sdk-plugin-smoke-")
    const packageName = `minicode-sdk-test-plugin-${Date.now()}`
    const packageDir = path.join(process.cwd(), "node_modules", packageName)

    try {
      const filePluginPath = path.join(cwd, "file-plugin.mjs")
      await Bun.write(
        filePluginPath,
        `
export default function pluginFactory() {
  return {
    id: "file.plugin",
    apiVersion: 1,
    setup() {
      return {
        sdk: {
          instructionFragments: ["from-file-plugin"],
        },
      }
    },
  }
}
`,
      )

      await mkdir(packageDir, { recursive: true })
      await Bun.write(
        path.join(packageDir, "package.json"),
        JSON.stringify({
          name: packageName,
          type: "module",
          exports: "./index.js",
        }),
      )

      await Bun.write(
        path.join(packageDir, "index.js"),
        `
import { tool } from "ai"
import { z } from "zod"

export default function pluginFactory() {
  return {
    id: "package.plugin",
    apiVersion: 1,
    setup() {
      return {
        sdk: {
          instructionFragments: ["from-package-plugin"],
          tools: {
            package_echo: tool({
              description: "Echo text from package plugin",
              inputSchema: z.object({ text: z.string() }),
              execute: async ({ text }) => ({
                ok: true,
                outputMessage: text,
              }),
            }),
          },
        },
        cli: {
          actions: [
            {
              id: "package-hello",
              title: "Package hello",
              aliases: ["pkg-hi"],
              run(ctx) {
                ctx.print("hello from package")
              },
            },
          ],
        },
      }
    },
  }
}
`,
      )

      const globalConfigPath = path.join(cwd, "global-config.json")
      await Bun.write(
        globalConfigPath,
        JSON.stringify({
          provider: "anthropic",
          model: "claude-3-5-sonnet-latest",
          apiKeys: {
            anthropic: "test-anthropic-key",
          },
          plugins: {
            [packageName]: {},
            [pathToFileURL(filePluginPath).toString()]: {},
          },
        }),
      )

      const sdk = await createMinicode({
        cwd,
        env: {
          MINICODE_GLOBAL_CONFIG: globalConfigPath,
        },
        experimental_modelFactory: ({ runtime }) => createToolLoopMockModel(runtime.provider),
      })

      const loadedPlugins = sdk.getLoadedPlugins()
      expect(loadedPlugins.map((plugin) => plugin.id).sort()).toEqual(["file.plugin", "package.plugin"])

      const tools = sdk.getTools()
      expect(Object.hasOwn(tools, "package_echo")).toBe(true)

      const cliActions = sdk.getCliActions()
      expect(cliActions.map((action) => action.id)).toContain("package-hello")
    } finally {
      await rm(packageDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })
})

describe("MINI-7 sessions + resume", () => {
  test("persists session state and resumes by id", async () => {
    const cwd = await createTempDirectory("minicode-sdk-session-resume-")
    const sessionsDir = path.join(cwd, "sessions")

    try {
      const sdk = await createMinicode({
        cwd,
        env: {
          MINICODE_SESSIONS_DIR: sessionsDir,
        },
        experimental_modelFactory: ({ runtime }) => createSessionTurnMockModel(runtime.provider),
      })

      const session = await sdk.openSession({
        id: "resume-me",
      })

      await session.send("first prompt").response
      const afterFirstTurn = session.snapshot()
      expect(afterFirstTurn.messages.length).toBeGreaterThan(0)
      expect(afterFirstTurn.usageTotals?.totalTokens).toBe(10)

      const sessionFilePath = path.join(sessionsDir, "resume-me", "session.json")
      const persistedRaw = await Bun.file(sessionFilePath).json()
      const persisted = persistedRaw as {
        messages?: unknown[]
        updatedAt?: number
      }
      expect(Array.isArray(persisted.messages)).toBe(true)

      const restartedSdk = await createMinicode({
        cwd,
        env: {
          MINICODE_SESSIONS_DIR: sessionsDir,
        },
        experimental_modelFactory: ({ runtime }) => createSessionTurnMockModel(runtime.provider),
      })

      const resumed = await restartedSdk.openSession({
        id: "resume-me",
        createIfMissing: false,
      })

      expect(resumed.snapshot().messages.length).toBe(afterFirstTurn.messages.length)

      await resumed.send("second prompt").response
      const afterSecondTurn = resumed.snapshot()
      expect(afterSecondTurn.messages.length).toBeGreaterThan(afterFirstTurn.messages.length)
      expect(afterSecondTurn.usageTotals?.totalTokens).toBe(20)

      const persistedAfterSecond = (await Bun.file(sessionFilePath).json()) as {
        updatedAt?: number
      }

      expect(typeof persistedAfterSecond.updatedAt).toBe("number")
      expect((persistedAfterSecond.updatedAt as number) >= (persisted.updatedAt as number)).toBe(true)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("applies model override on resume and rejects provider override", async () => {
    const cwd = await createTempDirectory("minicode-sdk-session-runtime-")
    const sessionsDir = path.join(cwd, "sessions")

    try {
      const sdk = await createMinicode({
        cwd,
        env: {
          MINICODE_SESSIONS_DIR: sessionsDir,
        },
        experimental_modelFactory: ({ runtime }) => createSessionTurnMockModel(runtime.provider),
      })

      const created = await sdk.openSession({ id: "runtime-switch" })
      expect(created.provider).toBe("anthropic")

      const resumedWithModel = await sdk.openSession({
        id: "runtime-switch",
        runtime: {
          model: "claude-3-7-sonnet-latest",
        },
      })

      expect(resumedWithModel.model).toBe("claude-3-7-sonnet-latest")

      let providerChangeError: unknown
      try {
        await sdk.openSession({
          id: "runtime-switch",
          runtime: {
            provider: "openai",
          },
        })
      } catch (error) {
        providerChangeError = error
      }

      expect(providerChangeError).toBeInstanceOf(Error)
      expect((providerChangeError as Error).message).toContain("Cannot change provider")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
