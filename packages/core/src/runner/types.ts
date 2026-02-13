import type {
  CoreAssistantMessage,
  CoreToolMessage,
  FinishReason,
  LanguageModel,
  LanguageModelUsage,
  ModelMessage,
  ToolLoopAgentOnStepFinishCallback,
  ToolLoopAgentSettings,
  ToolSet,
} from "ai"

export type TurnRequest =
  | {
      prompt: string
      messages?: never
      abortSignal?: AbortSignal
    }
  | {
      prompt?: never
      messages: Array<ModelMessage>
      abortSignal?: AbortSignal
    }

export type TurnResponseMessage = CoreAssistantMessage | CoreToolMessage

export type TurnResponse = {
  text: string
  responseMessages: Array<TurnResponseMessage>
  finishReason: FinishReason
  totalUsage: LanguageModelUsage
}

export type SerializedError = {
  name: string
  message: string
}

export type TurnEvent =
  | {
      type: "text_delta"
      text: string
    }
  | {
      type: "reasoning_delta"
      text: string
    }
  | {
      type: "tool_call"
      toolCallId: string
      toolName: string
      input: unknown
      providerExecuted?: boolean
    }
  | {
      type: "tool_result"
      toolCallId: string
      toolName: string
      input: unknown
      output: unknown
      providerExecuted?: boolean
    }
  | {
      type: "tool_error"
      toolCallId: string
      toolName: string
      input: unknown
      error: SerializedError
      providerExecuted?: boolean
    }
  | {
      type: "step_finish"
      finishReason: FinishReason
      usage: LanguageModelUsage
    }
  | {
      type: "finish"
      finishReason: FinishReason
      totalUsage: LanguageModelUsage
    }
  | {
      type: "abort"
    }
  | {
      type: "error"
      error: SerializedError
    }

export type Turn = {
  events: AsyncIterable<TurnEvent>
  response: Promise<TurnResponse>
  abort: () => void
}

export type Agent = {
  runTurn: (request: TurnRequest, transcript?: Array<ModelMessage>) => Turn
}

export type CreateAgentOptions<Tools extends ToolSet> = {
  model: LanguageModel
  tools?: Tools
  instructions?: string
  stopWhen?: ToolLoopAgentSettings<never, Tools>["stopWhen"]
  onStepFinish?: ToolLoopAgentOnStepFinishCallback<Tools>
}
