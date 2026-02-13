import { z } from "zod"
import { ProviderIdSchema } from "../config/schema"

export const SessionMessageSchema = z
  .object({
    role: z.string().trim().min(1),
  })
  .passthrough()

export const SessionUsageTotalsSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
    reasoningTokens: z.number().int().nonnegative().optional(),
    cachedInputTokens: z.number().int().nonnegative().optional(),
  })
  .passthrough()

export const SessionStateSchema = z
  .object({
    version: z.literal(1),
    id: z.string().trim().min(1),
    cwd: z.string().trim().min(1),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    provider: ProviderIdSchema,
    model: z.string().trim().min(1),
    messages: z.array(SessionMessageSchema).default([]),
    metadata: z.record(z.string(), z.unknown()).optional(),
    usageTotals: SessionUsageTotalsSchema.optional(),
    artifacts: z.array(z.unknown()).optional(),
  })
  .passthrough()

export type SessionState = z.output<typeof SessionStateSchema>

export type SessionSummary = {
  id: string
  cwd: string
  provider: z.infer<typeof ProviderIdSchema>
  model: string
  createdAt: number
  updatedAt: number
}
