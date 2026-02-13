import { tool, type Tool, type ToolCallOptions } from "ai"
import type { z } from "zod"
import { ToolOutputSchema, type ToolOutput } from "./shared"

export function defineTool<Input>(options: {
  description: string
  inputSchema: z.ZodType<Input>
  execute: (input: Input, callOptions: ToolCallOptions) => Promise<ToolOutput>
}): Tool<Input, ToolOutput> {
  return tool({
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: ToolOutputSchema,
    execute: options.execute,
    toModelOutput: (output: ToolOutput) => ({
      type: "text",
      value: output.outputMessage,
    }),
  })
}
