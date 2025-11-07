import { z } from "zod"
import { exec } from "child_process"
import * as _path from "path"
import { Tool } from "./tool"
import { Instance } from "@/project/instance"
import { Logger } from "@/util/logger"
import DESCRIPTION from "./description/bash.txt"

const MAX_OUTPUT_LENGTH = 30_000
const DEFAULT_TIMEOUT = 1 * 60 * 1000
const MAX_TIMEOUT = 10 * 60 * 1000

const _log = Logger.create({ service: "bash-tool" })

const tool = Tool.define("bash", {
  description: DESCRIPTION,
    parameters: z.object({
      command: z.string().describe("The command to execute"),
      timeout: z.number().describe("Optional timeout in milliseconds").optional(),
      description: z
        .string()
        .describe(
          "Clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'",
        ),
    }),
    async execute(params, ctx) {
      const timeout = Math.min(params.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)

      const process = exec(params.command, {
        cwd: Instance.directory,
        signal: ctx.abort,
        timeout,
      })

      let output = ""

      // Initialize metadata with empty output
      ctx.metadata({
        metadata: {
          output: "",
          description: params.description,
        },
      })

      process.stdout?.on("data", (chunk) => {
        output += chunk.toString()
        ctx.metadata({
          metadata: {
            output: output,
            description: params.description,
          },
        })
      })

      process.stderr?.on("data", (chunk) => {
        output += chunk.toString()
        ctx.metadata({
          metadata: {
            output: output,
            description: params.description,
          },
        })
      })

      await new Promise<void>((resolve) => {
        process.on("close", () => {
          resolve()
        })
      })

      ctx.metadata({
        metadata: {
          output: output,
          exit: process.exitCode,
          description: params.description,
        },
      })

      if (output.length > MAX_OUTPUT_LENGTH) {
        output = output.slice(0, MAX_OUTPUT_LENGTH)
        output += "\n\n(Output was truncated due to length limit)"
      }

      return {
        title: params.command,
        metadata: {
          output,
          exit: process.exitCode,
          description: params.description,
        },
        output,
      }
    },
})

export const Bash = {
  tool,
}
