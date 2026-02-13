import path from "node:path"
import { mkdir } from "node:fs/promises"
import { z } from "zod"
import { defineTool } from "./output"
import { resolveFilePath, success } from "./shared"

const WriteInputSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
})

type WriteToolOptions = {
  cwd: string
}

export function createWriteTool(options: WriteToolOptions) {
  return defineTool({
    description: "Write UTF-8 text content to a file",
    inputSchema: WriteInputSchema,
    execute: async (input, _callOptions) => {
      const filePath = resolveFilePath(options.cwd, input.filePath)
      const parent = path.dirname(filePath)

      await mkdir(parent, { recursive: true })
      await Bun.write(filePath, input.content)

      return success(`Wrote ${input.content.length} characters to ${input.filePath}`, {
        filePath,
        bytes: new TextEncoder().encode(input.content).byteLength,
      })
    },
  })
}
