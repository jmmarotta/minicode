import { z } from "zod"
import { defineTool } from "./output"
import { failure, resolveFilePath, success, truncateByBytes } from "./shared"

const ReadInputSchema = z.object({
  filePath: z.string().min(1),
  offset: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
})

type ReadToolOptions = {
  cwd: string
  maxReadBytes: number
  maxReadLines: number
}

export function createReadTool(options: ReadToolOptions) {
  return defineTool({
    description: "Read a UTF-8 text file",
    inputSchema: ReadInputSchema,
    execute: async (input, _callOptions) => {
      const filePath = resolveFilePath(options.cwd, input.filePath)
      const file = Bun.file(filePath)

      if (!(await file.exists())) {
        return failure(`File not found: ${input.filePath}`)
      }

      const text = await file.text()
      const allLines = text.split("\n")
      const startLine = Math.max(1, input.offset ?? 1)
      const maxLines = Math.min(input.limit ?? options.maxReadLines, options.maxReadLines)

      const selectedLines = allLines.slice(startLine - 1, startLine - 1 + maxLines)
      const numbered = selectedLines.map((line, index) => `${startLine + index}: ${line}`).join("\n")
      const truncated = truncateByBytes(numbered, options.maxReadBytes)

      return success(
        truncated.text,
        {
          filePath,
          lineCount: selectedLines.length,
        },
        {
          truncated: truncated.truncated,
        },
      )
    },
  })
}
