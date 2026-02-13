import type { ToolSet } from "ai"
import type { PluginReference } from "../config/schema"

export type PluginConfig = Record<string, unknown>

export type PluginSetupContext = {
  reference: PluginReference
  cwd: string
  globalConfigDir: string
  sdkVersion: string
  logger: {
    info: (message: string, details?: unknown) => void
    warn: (message: string, details?: unknown) => void
    error: (message: string, details?: unknown) => void
  }
}

export type PluginContribution = {
  sdk?: {
    tools?: ToolSet
    instructionFragments?: string[]
  }
}

export type MinicodePlugin = {
  id: string
  apiVersion: 1
  version?: string
  setup?: (ctx: PluginSetupContext) => PluginContribution | Promise<PluginContribution>
}

export type PluginFactory = (config: PluginConfig) => MinicodePlugin | Promise<MinicodePlugin>

export type LoadedPlugin = {
  reference: PluginReference
  normalizedReference: PluginReference
  plugin: MinicodePlugin
  contribution: PluginContribution
}
