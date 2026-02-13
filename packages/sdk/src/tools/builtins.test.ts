import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { ToolCallOptions } from "ai"
import type { ToolOutput } from "@minicode/core"
import { createBashTool } from "./bash"
import { createEditTool } from "./edit"
import { createReadTool } from "./read"
import { createWriteTool } from "./write"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

function isAsyncIterable(value: unknown): value is AsyncIterable<ToolOutput> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value
}

const defaultCallOptions: ToolCallOptions = {
  toolCallId: "tool-call",
  messages: [],
}

async function runTool<Input>(
  tool: {
    execute?: (
      input: Input,
      options: ToolCallOptions,
    ) => ToolOutput | PromiseLike<ToolOutput> | Promise<ToolOutput> | AsyncIterable<ToolOutput>
  },
  input: Input,
  callOptions: ToolCallOptions = defaultCallOptions,
): Promise<ToolOutput> {
  const result = await tool.execute?.(input, callOptions)
  if (!result || isAsyncIterable(result)) {
    throw new Error("Expected non-streaming tool output")
  }

  return result
}

describe("builtin tool contracts", () => {
  test("write + read tools return ToolOutput and model-facing text uses outputMessage", async () => {
    const cwd = await createTempDirectory("minicode-tools-read-write-")

    try {
      const writeTool = createWriteTool({ cwd })
      const writeOutput = await runTool(writeTool, {
        filePath: "nested/note.txt",
        content: "alpha\nbeta\ngamma",
      })

      expect(writeOutput.ok).toBe(true)
      expect(writeOutput.outputMessage).toContain("nested/note.txt")

      const modelOutput = writeTool.toModelOutput?.(writeOutput)
      expect(modelOutput).toEqual({
        type: "text",
        value: writeOutput.outputMessage,
      })

      const readTool = createReadTool({
        cwd,
        maxReadBytes: 10_000,
        maxReadLines: 100,
      })

      const readOutput = await runTool(readTool, {
        filePath: "nested/note.txt",
        offset: 2,
        limit: 1,
      })

      expect(readOutput.ok).toBe(true)
      expect(readOutput.outputMessage).toBe("2: beta")

      const missingOutput = await runTool(readTool, {
        filePath: "nested/missing.txt",
      })

      expect(missingOutput.ok).toBe(false)
      expect(missingOutput.outputMessage).toContain("File not found")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("edit tool enforces deterministic one-match semantics", async () => {
    const cwd = await createTempDirectory("minicode-tools-edit-")
    const filePath = path.join(cwd, "edit.txt")

    try {
      const editTool = createEditTool({ cwd })
      await Bun.write(filePath, "alpha beta alpha")

      const none = await runTool(editTool, {
        filePath: "edit.txt",
        oldText: "gamma",
        newText: "delta",
      })
      expect(none.ok).toBe(false)
      expect(none.outputMessage).toContain("not found exactly once")

      const many = await runTool(editTool, {
        filePath: "edit.txt",
        oldText: "alpha",
        newText: "delta",
      })
      expect(many.ok).toBe(false)
      expect(many.outputMessage).toContain("multiple locations")

      await Bun.write(filePath, "alpha beta")
      const one = await runTool(editTool, {
        filePath: "edit.txt",
        oldText: "beta",
        newText: "delta",
      })
      expect(one.ok).toBe(true)
      expect(await Bun.file(filePath).text()).toBe("alpha delta")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("bash tool reports success/failure with exit code and output", async () => {
    const cwd = await createTempDirectory("minicode-tools-bash-")

    try {
      const bashTool = createBashTool({
        cwd,
        defaultTimeoutMs: 5_000,
        maxOutputBytes: 10_000,
      })

      const successResult = await runTool(bashTool, {
        command: "printf 'hello world'",
      })

      expect(successResult.ok).toBe(true)
      expect(successResult.outputMessage).toBe("Command succeeded (exit 0)")
      expect(successResult.details).toMatchObject({
        command: "printf 'hello world'",
      })
      expect(successResult.meta).toMatchObject({
        exitCode: 0,
        truncated: false,
      })

      const failedResult = await runTool(bashTool, {
        command: "printf 'oops' >&2; exit 7",
      })

      expect(failedResult.ok).toBe(false)
      expect(failedResult.outputMessage).toBe("Command failed (exit 7)")
      expect(failedResult.meta).toMatchObject({
        exitCode: 7,
        truncated: false,
      })
      expect(failedResult.details).toMatchObject({
        command: "printf 'oops' >&2; exit 7",
      })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("bash tool reports timeout with consistent metadata", async () => {
    const cwd = await createTempDirectory("minicode-tools-bash-timeout-")

    try {
      const bashTool = createBashTool({
        cwd,
        defaultTimeoutMs: 5_000,
        maxOutputBytes: 10_000,
      })

      const timedOutResult = await runTool(bashTool, {
        command: "sleep 1",
        timeoutMs: 20,
      })

      expect(timedOutResult.ok).toBe(false)
      expect(timedOutResult.outputMessage).toContain("timed out")
      expect(timedOutResult.meta).toMatchObject({
        timeoutMs: 20,
        truncated: false,
      })
      expect(timedOutResult.details).toMatchObject({
        command: "sleep 1",
      })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
