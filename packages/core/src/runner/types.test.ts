import { describe, expect, test } from "bun:test"
import { TurnEventSchema, TurnRequestSchema, TurnResponseSchema } from "./types"

describe("runner type schemas", () => {
  test("validates turn request variants", () => {
    const promptRequest = {
      prompt: "Hello",
    }

    const messagesRequest = {
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    }

    expect(TurnRequestSchema.parse(promptRequest)).toEqual(promptRequest)
    expect(TurnRequestSchema.parse(messagesRequest)).toEqual(messagesRequest)
  })

  test("validates all emitted turn event kinds", () => {
    const usage = {
      inputTokens: 3,
      outputTokens: 7,
      totalTokens: 10,
    }

    const samples = [
      { type: "text_delta", text: "hi" },
      { type: "reasoning_delta", text: "thinking" },
      {
        type: "tool_call",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
      },
      {
        type: "tool_result",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
        output: { ok: true },
      },
      {
        type: "tool_error",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
        error: { name: "Error", message: "failed" },
      },
      {
        type: "step_finish",
        finishReason: "tool-calls",
        usage,
      },
      {
        type: "finish",
        finishReason: "stop",
        totalUsage: usage,
      },
      { type: "abort" },
      {
        type: "error",
        error: { name: "Error", message: "stream failed" },
      },
    ]

    for (const sample of samples) {
      const parsed = TurnEventSchema.parse(sample)
      expect(parsed).toMatchObject(sample)
    }
  })

  test("validates turn response envelope", () => {
    const response = {
      text: "ok",
      responseMessages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "ok" }],
        },
      ],
      finishReason: "stop",
      totalUsage: {
        inputTokens: 2,
        outputTokens: 4,
        totalTokens: 6,
      },
    }

    expect(TurnResponseSchema.parse(response)).toEqual(response)
  })

  test("rejects invalid turn events", () => {
    expect(() =>
      TurnEventSchema.parse({
        type: "tool_result",
        toolCallId: 123,
        toolName: "read",
      }),
    ).toThrow()
  })
})
