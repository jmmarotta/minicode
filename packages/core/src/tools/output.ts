import { tool, type FlexibleSchema, type Tool, type ToolCallOptions } from "ai"
import { z } from "zod"

export const ToolOutputSchema = z.strictObject({
  ok: z.boolean(),
  outputMessage: z.string(),
  details: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export type ToolOutput = z.output<typeof ToolOutputSchema>

export function success(outputMessage: string, details?: unknown, meta?: Record<string, unknown>): ToolOutput {
  return {
    ok: true,
    outputMessage,
    details,
    meta,
  }
}

export function failure(outputMessage: string, details?: unknown, meta?: Record<string, unknown>): ToolOutput {
  return {
    ok: false,
    outputMessage,
    details,
    meta,
  }
}

export function toModelTextOutput(output: ToolOutput): { type: "text"; value: string } {
  return {
    type: "text",
    value: output.outputMessage,
  }
}

function normalizeToolError(error: unknown): ToolOutput {
  if (error instanceof Error) {
    return failure(`Tool execution failed: ${error.message}`)
  }

  return failure("Tool execution failed")
}

export async function executeWithToolOutput<Input>(
  execute: (input: Input, callOptions: ToolCallOptions) => Promise<ToolOutput>,
  input: Input,
  callOptions: ToolCallOptions,
): Promise<ToolOutput> {
  try {
    const output = await execute(input, callOptions)
    return ToolOutputSchema.parse(output)
  } catch (error) {
    return normalizeToolError(error)
  }
}

export function defineTool<Input>(options: {
  description: string
  inputSchema: FlexibleSchema<Input>
  execute: (input: Input, callOptions: ToolCallOptions) => Promise<ToolOutput>
}): Tool<Input, ToolOutput> {
  return tool({
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: ToolOutputSchema,
    execute: (input, callOptions) => executeWithToolOutput(options.execute, input, callOptions),
    toModelOutput: toModelTextOutput,
  })
}
