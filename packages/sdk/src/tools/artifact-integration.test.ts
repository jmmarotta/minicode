import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { ToolCallOptions } from "ai"
import type { ToolOutput } from "@minicode/core"
import { FsArtifactStore } from "../session/artifact-store"
import { createBashTool } from "./bash"
import { createReadTool } from "./read"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

function isAsyncIterable(value: unknown): value is AsyncIterable<ToolOutput> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value
}

async function runTool<Input>(
  tool: {
    execute?: (
      input: Input,
      options: ToolCallOptions,
    ) => ToolOutput | PromiseLike<ToolOutput> | Promise<ToolOutput> | AsyncIterable<ToolOutput>
  },
  input: Input,
  options: ToolCallOptions,
): Promise<ToolOutput> {
  const result = await tool.execute?.(input, options)
  if (!result || isAsyncIterable(result)) {
    throw new Error("Expected non-streaming tool output")
  }

  return result
}

describe("artifact-backed truncation integration", () => {
  test("read tool offloads truncated output to artifact store", async () => {
    const cwd = await createTempDirectory("minicode-read-artifact-")
    const sessionsDir = path.join(cwd, "sessions")

    try {
      const artifactStore = new FsArtifactStore({ sessionsDir })
      const filePath = path.join(cwd, "large.txt")
      await Bun.write(filePath, "x".repeat(5000))

      const readTool = createReadTool({
        cwd,
        maxReadBytes: 120,
        maxReadLines: 2000,
        artifactStore,
      })

      const output = await runTool(
        readTool,
        {
          filePath: "large.txt",
        },
        {
          toolCallId: "call-read",
          messages: [],
          experimental_context: {
            sessionId: "session-read",
          },
        },
      )

      const meta = output.meta as { truncated?: boolean; artifact?: { id?: string } } | undefined
      expect(output.ok).toBe(true)
      expect(meta?.truncated).toBe(true)
      expect(typeof meta?.artifact?.id).toBe("string")
      expect(output.outputMessage).toContain("[full output stored as artifact")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("bash tool offloads truncated command output to artifact store", async () => {
    const cwd = await createTempDirectory("minicode-bash-artifact-")
    const sessionsDir = path.join(cwd, "sessions")

    try {
      const artifactStore = new FsArtifactStore({ sessionsDir })
      const bashTool = createBashTool({
        cwd,
        defaultTimeoutMs: 10_000,
        maxOutputBytes: 150,
        artifactStore,
      })

      const output = await runTool(
        bashTool,
        {
          command: "bun -e \"process.stdout.write('y'.repeat(5000))\"",
        },
        {
          toolCallId: "call-bash",
          messages: [],
          experimental_context: {
            sessionId: "session-bash",
          },
        },
      )

      const meta = output.meta as { truncated?: boolean; artifact?: { id?: string } } | undefined
      expect(meta?.truncated).toBe(true)
      expect(typeof meta?.artifact?.id).toBe("string")
      expect(output.details).toMatchObject({
        command: "bun -e \"process.stdout.write('y'.repeat(5000))\"",
      })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
