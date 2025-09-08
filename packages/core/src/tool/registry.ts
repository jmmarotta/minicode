import z from "zod"
import { ReadTool } from "./read"
import type { Agent } from "../agent"

const ALL = [ReadTool]

export function ids() {
  return ALL.map((t) => t.id)
}

export async function tools(providerID: string, _modelID: string) {
  const result = await Promise.all(
    ALL.map(async (t) => ({
      id: t.id,
      ...(await t.init()),
    })),
  )

  if (providerID === "openai") {
    return result.map((t) => ({
      ...t,
      parameters: optionalToNullable(t.parameters),
    }))
  }

  if (providerID === "google") {
    return result.map((t) => ({
      ...t,
      parameters: sanitizeGeminiParameters(t.parameters),
    }))
  }

  return result
}

export async function enabled(
  _providerID: string,
  _modelID: string,
  agent: Agent.Info,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  result["patch"] = false

  if (agent.permission.edit === "deny") {
    result["edit"] = false
    result["patch"] = false
    result["write"] = false
  }
  if (agent.permission.bash["*"] === "deny" && Object.keys(agent.permission.bash).length === 1) {
    result["bash"] = false
  }
  if (agent.permission.webfetch === "deny") {
    result["webfetch"] = false
  }

  return result
}

function sanitizeGeminiParameters(schema: z.ZodTypeAny, visited = new Set()): z.ZodTypeAny {
  if (!schema || visited.has(schema)) {
    return schema
  }
  visited.add(schema)

  if (schema instanceof z.ZodDefault) {
    const innerSchema = schema.removeDefault()
    // Handle Gemini's incompatibility with `default` on `anyOf` (unions).
    if (innerSchema instanceof z.ZodUnion) {
      // The schema was `z.union(...).default(...)`, which is not allowed.
      // We strip the default and return the sanitized union.
      return sanitizeGeminiParameters(innerSchema, visited)
    }
    // Otherwise, the default is on a regular type, which is allowed.
    // We recurse on the inner type and then re-apply the default.
    const defaultValue = (schema._zod.def as { defaultValue: () => unknown }).defaultValue()
    return sanitizeGeminiParameters(innerSchema as z.ZodTypeAny, visited).default(defaultValue)
  }

  if (schema instanceof z.ZodOptional) {
    return z.optional(sanitizeGeminiParameters(schema.unwrap() as z.ZodTypeAny, visited))
  }

  if (schema instanceof z.ZodObject) {
    const newShape: Record<string, z.ZodTypeAny> = {}
    for (const [key, value] of Object.entries(schema.shape)) {
      newShape[key] = sanitizeGeminiParameters(value as z.ZodTypeAny, visited)
    }
    return z.object(newShape)
  }

  if (schema instanceof z.ZodArray) {
    return z.array(sanitizeGeminiParameters(schema.element as z.ZodTypeAny, visited))
  }

  if (schema instanceof z.ZodUnion) {
    // This schema corresponds to `anyOf` in JSON Schema.
    // We recursively sanitize each option in the union.
    const sanitizedOptions = (schema.options as z.ZodTypeAny[]).map((option) =>
      sanitizeGeminiParameters(option, visited),
    )
    return z.union(sanitizedOptions as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
  }

  if (schema instanceof z.ZodString) {
    const newSchema = z.string()
    const safeChecks = ["min", "max", "length", "regex", "startsWith", "endsWith", "includes", "trim"]
    type StringCheck = { kind: string }
    ;(newSchema._zod.def as unknown as { checks: StringCheck[] }).checks = (
      schema._zod.def as unknown as { checks: StringCheck[] }
    ).checks.filter((check) => safeChecks.includes(check.kind))
    return newSchema
  }

  return schema
}

function optionalToNullable(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    const newShape: Record<string, z.ZodTypeAny> = {}

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodTypeAny
      if (zodValue instanceof z.ZodOptional) {
        const unwrapped = zodValue.unwrap() as z.ZodTypeAny
        newShape[key] = unwrapped.nullable()
      } else {
        newShape[key] = optionalToNullable(zodValue)
      }
    }

    return z.object(newShape)
  }

  if (schema instanceof z.ZodArray) {
    return z.array(optionalToNullable(schema.element as z.ZodTypeAny))
  }

  if (schema instanceof z.ZodUnion) {
    return z.union(
      (schema.options as z.ZodTypeAny[]).map((option) => optionalToNullable(option)) as [
        z.ZodTypeAny,
        z.ZodTypeAny,
        ...z.ZodTypeAny[],
      ],
    )
  }

  return schema
}
