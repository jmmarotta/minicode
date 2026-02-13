import { z } from "zod"
import type { RawCliArgs } from "./args"

const ProviderIdSchema = z.enum(["openai", "anthropic", "google", "openai-compatible"])
const NonEmptyStringSchema = z.string().trim().min(1)

export const CliArgsSchema = z
  .object({
    session: NonEmptyStringSchema.optional(),
    newSession: z.boolean().default(false),
    provider: ProviderIdSchema.optional(),
    model: NonEmptyStringSchema.optional(),
    footerHeight: z.coerce.number().int().min(4).max(30).default(10),
    cwd: NonEmptyStringSchema.optional(),
    help: z.boolean().default(false),
    version: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.provider && value.session && !value.newSession) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "--provider can only be used with new sessions. Pass --new-session or omit --session.",
        path: ["provider"],
      })
    }
  })

export type CliArgs = z.output<typeof CliArgsSchema>

export function parseCliArgs(raw: RawCliArgs): CliArgs {
  return CliArgsSchema.parse(raw)
}
