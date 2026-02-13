import type { TextStreamPart, ToolSet } from "ai"
import { serializeError } from "./errors"
import type { TurnEvent } from "./types"

export function mapStreamPartToTurnEvent<Tools extends ToolSet>(part: TextStreamPart<Tools>): TurnEvent | undefined {
  switch (part.type) {
    case "text-delta":
      return {
        type: "text_delta",
        text: part.text,
      }

    case "reasoning-delta":
      return {
        type: "reasoning_delta",
        text: part.text,
      }

    case "tool-call":
      return {
        type: "tool_call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
        providerExecuted: part.providerExecuted,
      }

    case "tool-result":
      return {
        type: "tool_result",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
        output: part.output,
        providerExecuted: part.providerExecuted,
      }

    case "tool-error":
      return {
        type: "tool_error",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
        error: serializeError(part.error),
        providerExecuted: part.providerExecuted,
      }

    case "finish-step":
      return {
        type: "step_finish",
        finishReason: part.finishReason,
        usage: part.usage,
      }

    case "finish":
      return {
        type: "finish",
        finishReason: part.finishReason,
        totalUsage: part.totalUsage,
      }

    case "abort":
      return {
        type: "abort",
      }

    case "error":
      return {
        type: "error",
        error: serializeError(part.error),
      }

    default:
      return undefined
  }
}
