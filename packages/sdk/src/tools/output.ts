import { tool, type Tool, type ToolCallOptions } from "ai"
import { ToolOutputSchema, executeWithToolOutput, toModelTextOutput, type ToolOutput } from "@minicode/core"
import type { z } from "zod"

export function defineTool<Input>(options: {
  description: string
  inputSchema: z.ZodType<Input>
  execute: (input: Input, callOptions: ToolCallOptions) => Promise<ToolOutput>
}): Tool<Input, ToolOutput> {
  return tool({
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: ToolOutputSchema,
    execute: (input, callOptions) => executeWithToolOutput(options.execute, input as Input, callOptions),
    toModelOutput: toModelTextOutput,
  })
}
