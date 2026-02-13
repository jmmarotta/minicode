import type { LanguageModelUsage, StreamTextResult, ToolSet } from "ai"
import { mapStreamPartToTurnEvent } from "./events"
import { serializeError } from "./errors"
import { createAsyncQueue } from "./queue"
import type { Turn, TurnEvent, TurnResponseMessage } from "./types"

const EMPTY_USAGE: LanguageModelUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === "AbortError" || error.message.toLowerCase().includes("abort")
}

export function createTurnFromStream<Tools extends ToolSet>(
  result: StreamTextResult<Tools, never>,
  abort: () => void,
): Turn {
  const events = createAsyncQueue<TurnEvent>()

  let emittedError = false
  let emittedAbort = false

  const response = (async () => {
    let text = ""

    try {
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          text += part.text
        }

        const event = mapStreamPartToTurnEvent(part)
        if (!event) {
          continue
        }

        if (event.type === "error") {
          emittedError = true
        }

        if (event.type === "abort") {
          emittedAbort = true
        }

        events.push(event)
      }

      const [steps, finishReason, totalUsage] = await Promise.all([
        result.steps,
        result.finishReason,
        result.totalUsage,
      ])

      const responseMessages = steps.flatMap((step) => step.response.messages) as Array<TurnResponseMessage>

      return {
        text,
        responseMessages,
        finishReason,
        totalUsage,
      }
    } catch (error) {
      if (emittedAbort || isAbortError(error)) {
        if (!emittedAbort) {
          events.push({
            type: "abort",
          })
        }

        const [steps, finishReason, totalUsage] = await Promise.all([
          result.steps.catch(() => []),
          result.finishReason.catch(() => "abort"),
          result.totalUsage.catch(() => EMPTY_USAGE),
        ])

        const responseMessages = steps.flatMap((step) => step.response.messages) as Array<TurnResponseMessage>

        return {
          text,
          responseMessages,
          finishReason,
          totalUsage,
        }
      }

      if (!emittedError) {
        events.push({
          type: "error",
          error: serializeError(error),
        })
      }

      throw error
    } finally {
      events.close()
    }
  })()

  return {
    events: events.iterable,
    response,
    abort,
  }
}
