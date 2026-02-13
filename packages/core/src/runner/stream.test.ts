import { describe, expect, test } from "bun:test"
import type { CoreAssistantMessage, CoreToolMessage, LanguageModelUsage, StreamTextResult, ToolSet } from "ai"
import { createTurnFromStream } from "./stream"

function toAsyncIterable<T>(items: Array<T>) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item
      }
    },
  }
}

describe("createTurnFromStream", () => {
  test("maps stream events and builds final response", async () => {
    const usage: LanguageModelUsage = {
      inputTokens: 9,
      outputTokens: 11,
      totalTokens: 20,
    }

    const responseMessages = [
      {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
      } as unknown as CoreAssistantMessage,
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "read",
            output: "ok",
          },
        ],
      } as unknown as CoreToolMessage,
    ]

    const fullStream = toAsyncIterable([
      {
        type: "text-delta",
        id: "text_1",
        text: "hello",
      },
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
      },
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "read",
        input: { filePath: "README.md" },
        output: { ok: true },
      },
      {
        type: "finish-step",
        finishReason: "tool-calls",
        usage,
      },
      {
        type: "finish",
        finishReason: "stop",
        totalUsage: usage,
      },
    ])

    const result = {
      fullStream,
      steps: Promise.resolve([
        {
          response: {
            messages: responseMessages,
          },
        },
      ]),
      finishReason: Promise.resolve("stop"),
      totalUsage: Promise.resolve(usage),
    } as unknown as StreamTextResult<ToolSet, never>

    const turn = createTurnFromStream(result, () => {})

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    const response = await turn.response

    expect(events.map((event) => event.type)).toEqual([
      "text_delta",
      "tool_call",
      "tool_result",
      "step_finish",
      "finish",
    ])
    expect(response.text).toBe("hello")
    expect(response.finishReason).toBe("stop")
    expect(response.totalUsage).toEqual(usage)
    expect(response.responseMessages).toEqual(responseMessages)
  })

  test("emits normalized error events when stream fails", async () => {
    const fullStream = {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            throw new Error("stream failed")
          },
        }
      },
    }

    const result = {
      fullStream,
      steps: Promise.resolve([]),
      finishReason: Promise.resolve("error"),
      totalUsage: Promise.resolve({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }),
    } as unknown as StreamTextResult<ToolSet, never>

    const turn = createTurnFromStream(result, () => {})

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    expect(events).toEqual([
      {
        type: "error",
        error: {
          name: "Error",
          message: "stream failed",
        },
      },
    ])

    let rejectedError: unknown
    try {
      await turn.response
    } catch (error) {
      rejectedError = error
    }

    expect(rejectedError).toBeInstanceOf(Error)
    expect((rejectedError as Error).message).toBe("stream failed")
  })

  test("emits abort events from stream parts and preserves partial text", async () => {
    const usage: LanguageModelUsage = {
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
    }

    const fullStream = toAsyncIterable([
      {
        type: "text-delta",
        id: "text_1",
        text: "partial",
      },
      {
        type: "abort",
      },
      {
        type: "finish",
        finishReason: "abort",
        totalUsage: usage,
      },
    ])

    const result = {
      fullStream,
      steps: Promise.resolve([]),
      finishReason: Promise.resolve("abort"),
      totalUsage: Promise.resolve(usage),
    } as unknown as StreamTextResult<ToolSet, never>

    const turn = createTurnFromStream(result, () => {})

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    const response = await turn.response

    expect(events.map((event) => event.type)).toEqual(["text_delta", "abort", "finish"])
    expect(response.text).toBe("partial")
    expect(response.finishReason).toBe("abort")
    expect(response.totalUsage).toEqual(usage)
  })

  test("normalizes abort errors and preserves partial text", async () => {
    const rejectedSteps = Promise.reject(new Error("aborted before steps"))
    const rejectedFinishReason = Promise.reject(new Error("aborted before finish"))
    const rejectedUsage = Promise.reject(new Error("aborted before usage"))

    void rejectedSteps.catch(() => undefined)
    void rejectedFinishReason.catch(() => undefined)
    void rejectedUsage.catch(() => undefined)

    const fullStream = {
      async *[Symbol.asyncIterator]() {
        yield {
          type: "text-delta",
          id: "text_1",
          text: "partial",
        }

        const error = new Error("operation aborted")
        error.name = "AbortError"
        throw error
      },
    }

    const result = {
      fullStream,
      steps: rejectedSteps,
      finishReason: rejectedFinishReason,
      totalUsage: rejectedUsage,
    } as unknown as StreamTextResult<ToolSet, never>

    const turn = createTurnFromStream(result, () => {})

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    const response = await turn.response

    expect(events.map((event) => event.type)).toEqual(["text_delta", "abort"])
    expect(response.text).toBe("partial")
    expect(response.responseMessages).toEqual([])
    expect(response.finishReason).toBe("abort")
    expect(response.totalUsage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    })
  })

  test("consumes fullStream exactly once", async () => {
    const usage: LanguageModelUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }

    let iteratorCreated = 0
    const fullStream = {
      [Symbol.asyncIterator]() {
        iteratorCreated += 1
        let done = false
        return {
          async next() {
            if (done) {
              return { done: true, value: undefined }
            }

            done = true
            return {
              done: false,
              value: {
                type: "finish",
                finishReason: "stop",
                totalUsage: usage,
              },
            }
          },
        }
      },
    }

    const result = {
      fullStream,
      steps: Promise.resolve([]),
      finishReason: Promise.resolve("stop"),
      totalUsage: Promise.resolve(usage),
    } as unknown as StreamTextResult<ToolSet, never>

    const turn = createTurnFromStream(result, () => {})

    for await (const _event of turn.events) {
      // drain events
    }
    await turn.response

    expect(iteratorCreated).toBe(1)
  })
})
