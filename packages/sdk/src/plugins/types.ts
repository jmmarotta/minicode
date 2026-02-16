import type { ToolSet } from "ai"
import type { PluginReference, ProviderId } from "../config/schema"

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

export type PluginCliActionContext = {
  args: string
  print: (text: string) => void
  abortTurn: () => void
  switchSession: (input: { id?: string; createNew?: boolean }) => Promise<void>
  switchRuntime: (input: { provider?: ProviderId; model?: string }) => Promise<void>
}

export type PluginCliAction = {
  id: string
  title: string
  description?: string
  aliases?: string[]
  allowDuringTurn?: boolean
  run: (context: PluginCliActionContext) => Promise<void> | void
}

export type PluginContribution = {
  sdk?: {
    tools?: ToolSet
    instructionFragments?: string[]
  }
  cli?: {
    actions?: PluginCliAction[]
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

export type ComposedCliAction = {
  id: string
  title: string
  description?: string
  aliases: string[]
  allowDuringTurn: boolean
  run: PluginCliAction["run"]
  sourcePluginId: string
  sourceReference: PluginReference
}
