import { describe, expect, test } from "bun:test"
import { MockLanguageModelV3, simulateReadableStream } from "ai/test"
import { createAgent } from "./agent"

describe("createAgent", () => {
  test("returns turn handle and streams a successful response", async () => {
    const model = new MockLanguageModelV3({
      provider: "test",
      modelId: "agent-success",
      doStream: async () => {
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "text_1" },
              { type: "text-delta", id: "text_1", delta: "hello" },
              { type: "text-end", id: "text_1" },
              {
                type: "finish",
                finishReason: "stop",
                usage: {
                  inputTokens: 2,
                  outputTokens: 3,
                  totalTokens: 5,
                },
              },
            ],
          }),
        } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
      },
    })

    const agent = createAgent({
      model,
    })

    const turn = agent.runTurn({ prompt: "say hello" })

    expect(typeof turn.abort).toBe("function")
    expect(turn.events).toBeDefined()
    expect(turn.response).toBeDefined()

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    const response = await turn.response

    expect(events.some((event) => event.type === "text_delta")).toBe(true)
    expect(events.some((event) => event.type === "finish")).toBe(true)
    expect(response.text).toBe("hello")
    expect(response.finishReason).toBe("stop")
    expect(response.totalUsage.totalTokens).toBe(5)
    expect(model.doStreamCalls.length).toBe(1)
  })

  test("supports aborting in-flight turns via turn handle", async () => {
    const model = new MockLanguageModelV3({
      provider: "test",
      modelId: "agent-abort",
      doStream: async ({ abortSignal }) => {
        return {
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "stream-start",
                warnings: [],
              })

              let finished = false
              const timer = setTimeout(() => {
                if (finished) return
                finished = true

                controller.enqueue({ type: "text-start", id: "text_1" })
                controller.enqueue({ type: "text-delta", id: "text_1", delta: "late" })
                controller.enqueue({ type: "text-end", id: "text_1" })
                controller.enqueue({
                  type: "finish",
                  finishReason: "stop",
                  usage: {
                    inputTokens: 1,
                    outputTokens: 1,
                    totalTokens: 2,
                  },
                })
                controller.close()
              }, 250)

              const abort = () => {
                if (finished) return
                finished = true
                clearTimeout(timer)
                const error = new Error("aborted by test")
                error.name = "AbortError"
                controller.error(error)
              }

              if (abortSignal?.aborted) {
                abort()
                return
              }

              abortSignal?.addEventListener("abort", abort, { once: true })
            },
          }),
        } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
      },
    })

    const agent = createAgent({ model })
    const turn = agent.runTurn({ prompt: "abort this turn" })

    turn.abort()

    const events = []
    for await (const event of turn.events) {
      events.push(event)
    }

    const response = await turn.response

    expect(events.some((event) => event.type === "abort")).toBe(true)
    expect(response.finishReason).toBe("abort")
    expect(response.responseMessages).toEqual([])
  })

  test("rejects empty prompt requests", () => {
    const model = new MockLanguageModelV3({
      provider: "test",
      modelId: "agent-empty-prompt",
      doStream: async () => {
        return {
          stream: simulateReadableStream({
            chunks: [],
          }),
        } as unknown as Awaited<ReturnType<MockLanguageModelV3["doStream"]>>
      },
    })

    const agent = createAgent({ model })

    expect(() => agent.runTurn({ prompt: "   " })).toThrow("Turn request prompt must not be empty")
  })
})
