import { describe, expect, test } from "bun:test"
import type { ToolCallOptions } from "ai"
import { z } from "zod"
import { defineTool, executeWithToolOutput, success, toModelTextOutput, type ToolOutput } from "./output"

const callOptions = {
  abortSignal: new AbortController().signal,
} as ToolCallOptions

function isAsyncIterable(value: unknown): value is AsyncIterable<ToolOutput> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value
}

describe("tool output helpers", () => {
  test("returns successful tool output unchanged", async () => {
    const result = await executeWithToolOutput(
      async () => success("ok", { hidden: true }, { source: "test" }),
      { value: "x" },
      callOptions,
    )

    expect(result).toEqual({
      ok: true,
      outputMessage: "ok",
      details: { hidden: true },
      meta: { source: "test" },
    })
  })

  test("normalizes thrown execute errors to failed output", async () => {
    const result = await executeWithToolOutput(
      async () => {
        throw new Error("boom")
      },
      { value: "x" },
      callOptions,
    )

    expect(result.ok).toBe(false)
    expect(result.outputMessage).toContain("Tool execution failed")
    expect(result.outputMessage).toContain("boom")
  })

  test("maps model output from outputMessage only", () => {
    const modelOutput = toModelTextOutput(success("safe text", { private: "details" }, { internal: "meta" }))

    expect(modelOutput).toEqual({
      type: "text",
      value: "safe text",
    })
  })

  test("defineTool converts thrown execute errors to failed output", async () => {
    const wrapped = defineTool({
      description: "throws",
      inputSchema: z.object({ value: z.string() }),
      execute: async () => {
        throw new Error("kaboom")
      },
    })

    const output = await wrapped.execute?.({ value: "x" }, callOptions)
    if (!output || isAsyncIterable(output)) {
      throw new Error("Expected a non-stream tool output")
    }

    expect(output.ok).toBe(false)
    expect(output.outputMessage).toContain("kaboom")
  })
})
