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

const RequiredUnknownSchema = z.custom<unknown>((value) => value !== undefined, {
  message: "Required",
})

export const TurnMessageSchema = z.looseObject({
  role: z.string().trim().min(1),
  content: RequiredUnknownSchema,
})

export type TurnMessage = z.output<typeof TurnMessageSchema>

export const TurnUsageSchema = z.looseObject({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
})

export const TurnRequestSchema = z.union([
  z.strictObject({
    prompt: z.string().trim().min(1),
    messages: z.never().optional(),
    abortSignal: AbortSignalSchema.optional(),
  }),
  z.strictObject({
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

export const TurnResponseSchema = z.strictObject({
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

export const SerializedErrorSchema = z.strictObject({
  name: z.string().trim().min(1),
  message: z.string(),
})

export type SerializedError = z.output<typeof SerializedErrorSchema>

const TextDeltaTurnEventSchema = z.strictObject({
  type: z.literal("text_delta"),
  text: z.string(),
})

const ReasoningDeltaTurnEventSchema = z.strictObject({
  type: z.literal("reasoning_delta"),
  text: z.string(),
})

const ToolCallTurnEventSchema = z.strictObject({
  type: z.literal("tool_call"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: RequiredUnknownSchema,
  providerExecuted: z.boolean().optional(),
})

const ToolResultTurnEventSchema = z.strictObject({
  type: z.literal("tool_result"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: RequiredUnknownSchema,
  output: RequiredUnknownSchema,
  providerExecuted: z.boolean().optional(),
})

const ToolErrorTurnEventSchema = z.strictObject({
  type: z.literal("tool_error"),
  toolCallId: z.string().trim().min(1),
  toolName: z.string().trim().min(1),
  input: RequiredUnknownSchema,
  error: SerializedErrorSchema,
  providerExecuted: z.boolean().optional(),
})

const StepFinishTurnEventSchema = z.strictObject({
  type: z.literal("step_finish"),
  finishReason: z.string().trim().min(1),
  usage: TurnUsageSchema,
})

const FinishTurnEventSchema = z.strictObject({
  type: z.literal("finish"),
  finishReason: z.string().trim().min(1),
  totalUsage: TurnUsageSchema,
})

const AbortTurnEventSchema = z.strictObject({
  type: z.literal("abort"),
})

const ErrorTurnEventSchema = z.strictObject({
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
  context?: unknown
}
