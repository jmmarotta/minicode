import { z } from "zod"
import { defineTool, failure, success } from "@minicode/core"
import { resolveFilePath } from "./shared"

const EditInputSchema = z.strictObject({
  filePath: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string(),
})

type EditInput = z.output<typeof EditInputSchema>

type EditToolOptions = {
  cwd: string
}

export function createEditTool(options: EditToolOptions) {
  return defineTool<EditInput>({
    description: "Replace one exact string match in a text file",
    inputSchema: EditInputSchema,
    execute: async (input: EditInput, _callOptions) => {
      const filePath = resolveFilePath(options.cwd, input.filePath)
      const file = Bun.file(filePath)

      if (!(await file.exists())) {
        return failure(`File not found: ${input.filePath}`)
      }

      const content = await file.text()
      const matches = content.split(input.oldText).length - 1

      if (matches === 0) {
        return failure("edit failed: oldText was not found exactly once")
      }

      if (matches > 1) {
        return failure("edit failed: oldText matches multiple locations")
      }

      const next = content.replace(input.oldText, input.newText)
      await Bun.write(filePath, next)

      return success(`Updated ${input.filePath}`, {
        filePath,
        replacedCharacters: input.oldText.length,
      })
    },
  })
}
