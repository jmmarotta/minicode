import { z } from "zod"

const NonEmptyStringSchema = z.string().trim().min(1)

const OptionalFunctionSchema = z.custom<unknown>((value) => value === undefined || typeof value === "function", {
  message: "Expected function",
})

const RequiredFunctionSchema = z.custom<unknown>((value) => typeof value === "function", {
  message: "Expected function",
})

export const PluginToolsSchema = z.record(z.string(), z.unknown())

export const PluginCliActionSchema = z.looseObject({
  id: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  description: NonEmptyStringSchema.optional(),
  aliases: z.array(NonEmptyStringSchema).optional(),
  allowDuringTurn: z.boolean().optional(),
  run: RequiredFunctionSchema,
})

export const PluginCliContributionSchema = z.looseObject({
  actions: z.array(PluginCliActionSchema).optional(),
})

export const PluginSdkContributionSchema = z.looseObject({
  tools: PluginToolsSchema.optional(),
  instructionFragments: z.array(z.string()).optional(),
})

export const PluginContributionSchema = z.looseObject({
  sdk: PluginSdkContributionSchema.optional(),
  cli: PluginCliContributionSchema.optional(),
})

export const MinicodePluginSchema = z.looseObject({
  id: NonEmptyStringSchema,
  apiVersion: z.literal(1),
  version: NonEmptyStringSchema.optional(),
  setup: OptionalFunctionSchema.optional(),
})
