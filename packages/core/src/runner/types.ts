import type {
  LanguageModel,
  LanguageModelUsage,
  ModelMessage,
  ToolLoopAgentOnStepFinishCallback,
  ToolLoopAgentSettings,
  ToolSet,
} from "ai"
import { z } from "zod"

const AbortSignalSchema = z.custom<AbortSignal>((value) => value instanceof AbortSignal, {
  message: "Expected AbortSignal",
})

export const TurnMessageSchema = z
  .object({
    role: z.string().trim().min(1),
    content: z.unknown(),
  })
  .passthrough()

export type TurnMessage = z.output<typeof TurnMessageSchema>

export const TurnUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
    reasoningTokens: z.number().int().nonnegative().optional(),
    cachedInputTokens: z.number().int().nonnegative().optional(),
  })
  .passthrough()

export const TurnRequestSchema = z.union([
  z.object({
    prompt: z.string().trim().min(1),
    messages: z.never().optional(),
    abortSignal: AbortSignalSchema.optional(),
  }),
  z.object({
    prompt: z.never().optional(),
    messages: z.array(TurnMessageSchema),
    abortSignal: AbortSignalSchema.optional(),
  }),
])

export type TurnRequest =
  | {
      prompt: string
      messages?: never
      abortSignal?: AbortSignal
    }
  | {
      prompt?: never
      messages: Array<TurnMessage>
      abortSignal?: AbortSignal
    }

export type TurnResponseMessage = TurnMessage

export const TurnResponseSchema = z.object({
  text: z.string(),
  responseMessages: z.array(TurnMessageSchema),
  finishReason: z.string().trim().min(1),
  totalUsage: TurnUsageSchema,
})

export type TurnResponse = {
  text: string
  responseMessages: Array<TurnResponseMessage>
  finishReason: string
  totalUsage: LanguageModelUsage
}

export const SerializedErrorSchema = z.object({
  name: z.string().trim().min(1),
  message: z.string(),
})

export type SerializedError = z.output<typeof SerializedErrorSchema>

const TextDeltaTurnEventSchema = z.object({
  type: z.literal("text_delta"),
  text: z.string(),
})

const ReasoningDeltaTurnEventSchema = z.object({
  type: z.literal("reasoning_delta"),
  text: z.string(),
})

const ToolCallTurnEventSchema = z.object({
  type: z.literal("tool_call"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: z.unknown(),
  providerExecuted: z.boolean().optional(),
})

const ToolResultTurnEventSchema = z.object({
  type: z.literal("tool_result"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: z.unknown(),
  output: z.unknown(),
  providerExecuted: z.boolean().optional(),
})

const ToolErrorTurnEventSchema = z.object({
  type: z.literal("tool_error"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: z.unknown(),
  error: SerializedErrorSchema,
  providerExecuted: z.boolean().optional(),
})

const StepFinishTurnEventSchema = z.object({
  type: z.literal("step_finish"),
  finishReason: z.string().trim().min(1),
  usage: TurnUsageSchema,
})

const FinishTurnEventSchema = z.object({
  type: z.literal("finish"),
  finishReason: z.string().trim().min(1),
  totalUsage: TurnUsageSchema,
})

const AbortTurnEventSchema = z.object({
  type: z.literal("abort"),
})

const ErrorTurnEventSchema = z.object({
  type: z.literal("error"),
  error: SerializedErrorSchema,
})

export const TurnEventSchema = z.discriminatedUnion("type", [
  TextDeltaTurnEventSchema,
  ReasoningDeltaTurnEventSchema,
  ToolCallTurnEventSchema,
  ToolResultTurnEventSchema,
  ToolErrorTurnEventSchema,
  StepFinishTurnEventSchema,
  FinishTurnEventSchema,
  AbortTurnEventSchema,
  ErrorTurnEventSchema,
])

export type TurnEvent = z.output<typeof TurnEventSchema>

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
