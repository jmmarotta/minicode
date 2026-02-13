import { z } from "zod"

const NonEmptyStringSchema = z.string().trim().min(1)

const OptionalFunctionSchema = z.custom<unknown>((value) => value === undefined || typeof value === "function", {
  message: "Expected function",
})

export const PluginToolsSchema = z.record(z.string(), z.unknown())

export const PluginSdkContributionSchema = z.looseObject({
  tools: PluginToolsSchema.optional(),
  instructionFragments: z.array(z.string()).optional(),
})

export const PluginContributionSchema = z.looseObject({
  sdk: PluginSdkContributionSchema.optional(),
})

export const MinicodePluginSchema = z.looseObject({
  id: NonEmptyStringSchema,
  apiVersion: z.literal(1),
  version: NonEmptyStringSchema.optional(),
  setup: OptionalFunctionSchema.optional(),
})
