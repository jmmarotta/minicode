import { describe, expect, test } from "bun:test"
import path from "node:path"
import type { Minicode, OpenSessionOptions, Session } from "@minicode/sdk"
import { startCli } from "./start"

function createSessionStub(): Session {
  return {
    id: "session-1",
    cwd: "/tmp",
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    send() {
      throw new Error("not implemented in test")
    },
    turn() {
      throw new Error("not implemented in test")
    },
    snapshot() {
      throw new Error("not implemented in test")
    },
  }
}

describe("startCli", () => {
  test("creates SDK, opens session, and starts app with parsed options", async () => {
    const outputs: string[] = []
    const createCalls: Array<{ cwd?: string } | undefined> = []
    const openSessionCalls: Array<OpenSessionOptions | undefined> = []
    const runAppCalls: Array<{ footerHeight?: number; sessionId: string }> = []

    const session = createSessionStub()
    const sdk = {
      openSession: async (options?: OpenSessionOptions) => {
        openSessionCalls.push(options)
        return session
      },
    } as unknown as Minicode

    await startCli(
      [
        "--session",
        "session-123",
        "--new-session",
        "--provider",
        "openai",
        "--model",
        "gpt-4o-mini",
        "--footer-height",
        "8",
        "--cwd",
        "./workspace",
      ],
      {
        createMinicode: async (options) => {
          createCalls.push(options)
          return sdk
        },
        runCliApp: async (options) => {
          runAppCalls.push({
            footerHeight: options.footerHeight,
            sessionId: options.session.id,
          })
        },
        writeStdout(value: string) {
          outputs.push(value)
        },
        readCliVersion: async () => "9.9.9",
      },
    )

    expect(createCalls).toEqual([
      {
        cwd: path.resolve("./workspace"),
      },
    ])

    expect(openSessionCalls).toEqual([
      {
        id: "session-123",
        createIfMissing: true,
        runtime: {
          provider: "openai",
          model: "gpt-4o-mini",
        },
      },
    ])

    expect(runAppCalls).toEqual([
      {
        footerHeight: 8,
        sessionId: "session-1",
      },
    ])

    expect(outputs).toHaveLength(0)
  })

  test("prints help and returns before SDK startup", async () => {
    let createCalls = 0
    let runAppCalls = 0
    const outputs: string[] = []

    await startCli(["--help"], {
      createMinicode: async () => {
        createCalls += 1
        return {} as Minicode
      },
      runCliApp: async () => {
        runAppCalls += 1
      },
      writeStdout(value: string) {
        outputs.push(value)
      },
      readCliVersion: async () => "9.9.9",
    })

    expect(outputs.join("")).toContain("Usage: minicode")
    expect(createCalls).toBe(0)
    expect(runAppCalls).toBe(0)
  })

  test("prints version and returns before SDK startup", async () => {
    let createCalls = 0
    let runAppCalls = 0
    const outputs: string[] = []

    await startCli(["--version"], {
      createMinicode: async () => {
        createCalls += 1
        return {} as Minicode
      },
      runCliApp: async () => {
        runAppCalls += 1
      },
      writeStdout(value: string) {
        outputs.push(value)
      },
      readCliVersion: async () => "9.9.9",
    })

    expect(outputs).toEqual(["9.9.9\n"])
    expect(createCalls).toBe(0)
    expect(runAppCalls).toBe(0)
  })

  test("reports invalid schema combinations clearly", async () => {
    let error: unknown

    try {
      await startCli(["--session", "session-1", "--provider", "openai"], {
        createMinicode: async () => {
          throw new Error("should not run")
        },
        runCliApp: async () => {
          throw new Error("should not run")
        },
        writeStdout() {},
        readCliVersion: async () => "9.9.9",
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("Invalid CLI arguments")
  })
})
