import type { ToolSet } from "ai"
import { ToolOutputSchema, type ToolOutput } from "@minicode/core"
import type { ResolvedSdkConfig } from "../config/schema"
import { createBashTool } from "./bash"
import { createEditTool } from "./edit"
import { createReadTool } from "./read"
import { createWriteTool } from "./write"

type BuiltinToolOptions = {
  cwd: string
  config: ResolvedSdkConfig
}

export function createBuiltinTools(options: BuiltinToolOptions): ToolSet {
  const limits = options.config.toolLimits

  return {
    read: createReadTool({
      cwd: options.cwd,
      maxReadBytes: limits.maxReadBytes,
      maxReadLines: limits.maxReadLines,
    }),
    write: createWriteTool({ cwd: options.cwd }),
    edit: createEditTool({ cwd: options.cwd }),
    bash: createBashTool({
      cwd: options.cwd,
      defaultTimeoutMs: limits.defaultCommandTimeoutMs,
      maxOutputBytes: limits.maxCommandOutputBytes,
    }),
  }
}

export { ToolOutputSchema }
export type { ToolOutput }
