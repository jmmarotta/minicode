import { SessionStateSchema as CoreSessionStateSchema, TurnMessageSchema, TurnUsageSchema } from "@minicode/core"
import { z } from "zod"
import { ProviderIdSchema } from "../config/schema"
import { ArtifactReferenceSchema } from "./artifact-store"

export const SessionMessageSchema = TurnMessageSchema
export const SessionUsageTotalsSchema = TurnUsageSchema

export const SessionStateSchema = CoreSessionStateSchema.extend({
  version: z.literal(1),
  cwd: z.string().trim().min(1),
  provider: ProviderIdSchema,
  model: z.string().trim().min(1),
  messages: z.array(SessionMessageSchema).default([]),
  usageTotals: SessionUsageTotalsSchema.optional(),
  artifacts: z.array(ArtifactReferenceSchema).optional(),
})

export type SessionState = z.output<typeof SessionStateSchema>

export type SessionSummary = {
  id: string
  cwd: string
  provider: z.infer<typeof ProviderIdSchema>
  model: string
  createdAt: number
  updatedAt: number
}
