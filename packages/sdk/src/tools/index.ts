import type { ToolSet } from "ai"
import { ToolOutputSchema, type ToolOutput } from "@minicode/core"
import type { ResolvedSdkConfig } from "../config/schema"
import type { ArtifactStore } from "../session/artifact-store"
import { createBashTool } from "./bash"
import { createEditTool } from "./edit"
import { createReadTool } from "./read"
import { createWriteTool } from "./write"

type BuiltinToolOptions = {
  cwd: string
  config: ResolvedSdkConfig
  artifactStore?: ArtifactStore
}

export function createBuiltinTools(options: BuiltinToolOptions): ToolSet {
  const limits = options.config.toolLimits

  const tools = {
    read: createReadTool({
      cwd: options.cwd,
      maxReadBytes: limits.maxReadBytes,
      maxReadLines: limits.maxReadLines,
      artifactStore: options.artifactStore,
    }),
    write: createWriteTool({ cwd: options.cwd }),
    edit: createEditTool({ cwd: options.cwd }),
    bash: createBashTool({
      cwd: options.cwd,
      defaultTimeoutMs: limits.defaultCommandTimeoutMs,
      maxOutputBytes: limits.maxCommandOutputBytes,
      artifactStore: options.artifactStore,
    }),
  }

  return tools as ToolSet
}

export { ToolOutputSchema }
export type { ToolOutput }
