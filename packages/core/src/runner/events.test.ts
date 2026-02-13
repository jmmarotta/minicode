import { describe, expect, test } from "bun:test"
import type { TextStreamPart, ToolSet } from "ai"
import { mapStreamPartToTurnEvent } from "./events"

function map(part: unknown) {
  return mapStreamPartToTurnEvent(part as TextStreamPart<ToolSet>)
}

describe("mapStreamPartToTurnEvent", () => {
  test("maps text and reasoning deltas", () => {
    expect(
      map({
        type: "text-delta",
        id: "text_1",
        text: "hello",
      }),
    ).toEqual({
      type: "text_delta",
      text: "hello",
    })

    expect(
      map({
        type: "reasoning-delta",
        id: "reason_1",
        text: "thinking",
      }),
    ).toEqual({
      type: "reasoning_delta",
      text: "thinking",
    })
  })

  test("maps tool call, result, and error parts", () => {
    expect(
      map({
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
        providerExecuted: false,
      }),
    ).toEqual({
      type: "tool_call",
      toolCallId: "call_1",
      toolName: "read",
      input: { filePath: "README.md" },
      providerExecuted: false,
    })

    expect(
      map({
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
        output: { ok: true },
        providerExecuted: false,
      }),
    ).toEqual({
      type: "tool_result",
      toolCallId: "call_1",
      toolName: "read",
      input: { filePath: "README.md" },
      output: { ok: true },
      providerExecuted: false,
    })

    const toolError = map({
      type: "tool-error",
      toolCallId: "call_1",
      toolName: "read",
      input: { filePath: "README.md" },
      error: new Error("tool failed"),
      providerExecuted: true,
    })

    expect(toolError).toEqual({
      type: "tool_error",
      toolCallId: "call_1",
      toolName: "read",
      input: { filePath: "README.md" },
      error: {
        name: "Error",
        message: "tool failed",
      },
      providerExecuted: true,
    })
  })

  test("maps finish-step, finish, abort, and error", () => {
    const usage = {
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
    }

    expect(
      map({
        type: "finish-step",
        finishReason: "tool-calls",
        usage,
      }),
    ).toEqual({
      type: "step_finish",
      finishReason: "tool-calls",
      usage,
    })

    expect(
      map({
        type: "finish",
        finishReason: "stop",
        totalUsage: usage,
      }),
    ).toEqual({
      type: "finish",
      finishReason: "stop",
      totalUsage: usage,
    })

    expect(
      map({
        type: "abort",
      }),
    ).toEqual({
      type: "abort",
    })

    expect(
      map({
        type: "error",
        error: new Error("stream failed"),
      }),
    ).toEqual({
      type: "error",
      error: {
        name: "Error",
        message: "stream failed",
      },
    })
  })

  test("ignores unsupported stream part types", () => {
    expect(
      map({
        type: "raw",
        rawValue: { x: 1 },
      }),
    ).toBeUndefined()
  })
})
