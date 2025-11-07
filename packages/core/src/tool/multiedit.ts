import { z } from "zod"
import { Tool } from "./tool"
import { Edit } from "./edit"
import DESCRIPTION from "./description/multiedit.txt"
import path from "path"
import { Instance } from "@/project/instance"
import { Logger } from "@/util/logger"

const _log = Logger.create({ service: "multiedit-tool" })

const tool = Tool.define("multiedit", {
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z.string().describe("The absolute path to the file to modify"),
    edits: z
      .array(
        z.object({
          filePath: z.string().describe("The absolute path to the file to modify"),
          oldString: z.string().describe("The text to replace"),
          newString: z.string().describe("The text to replace it with (must be different from oldString)"),
          replaceAll: z.boolean().optional().describe("Replace all occurrences of oldString (default false)"),
        }),
      )
      .describe("Array of edit operations to perform sequentially on the file"),
  }),
  async execute(params, ctx) {
    const editTool = await Edit.tool.init()
    const results = []
    for (const [, edit] of params.edits.entries()) {
      const result = await editTool.execute(
        {
          filePath: params.filePath,
          oldString: edit.oldString,
          newString: edit.newString,
          replaceAll: edit.replaceAll,
        },
        ctx,
      )
      results.push(result)
    }
    return {
      title: path.relative(Instance.worktree, params.filePath),
      metadata: {
        results: results.map((r) => r.metadata),
      },
      output: results.at(-1)!.output,
    }
  },
})

export const MultiEdit = {
  tool,
}
