import type { StreamTextResult, ToolSet } from "ai"
import { mapStreamPartToTurnEvent } from "./events"
import { serializeError } from "./errors"
import { createAsyncQueue } from "./queue"
import type { Turn, TurnEvent, TurnResponseMessage } from "./types"

export function createTurnFromStream<Tools extends ToolSet>(
  result: StreamTextResult<Tools, never>,
  abort: () => void,
): Turn {
  const events = createAsyncQueue<TurnEvent>()

  let emittedError = false

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
