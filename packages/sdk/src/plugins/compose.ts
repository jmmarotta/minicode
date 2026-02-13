import type { ToolSet } from "ai"
import type { LoadedPlugin } from "./types"

export type ComposedSdkContributions = {
  tools: ToolSet
  instructionFragments: string[]
}

export function composeSdkContributions(builtinTools: ToolSet, plugins: LoadedPlugin[]): ComposedSdkContributions {
  const tools: ToolSet = { ...builtinTools }
  const instructionFragments: string[] = []

  for (const loadedPlugin of plugins) {
    const pluginTools = loadedPlugin.contribution.sdk?.tools
    if (pluginTools) {
      for (const [toolName, toolDef] of Object.entries(pluginTools)) {
        if (Object.hasOwn(tools, toolName)) {
          throw new Error(
            `Plugin compose failed [tool conflict] ${loadedPlugin.normalizedReference}: duplicate tool '${toolName}'`,
          )
        }
        tools[toolName] = toolDef
      }
    }

    const fragments = loadedPlugin.contribution.sdk?.instructionFragments || []
    instructionFragments.push(...fragments)
  }

  return {
    tools,
    instructionFragments,
  }
}
