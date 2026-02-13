import type { LanguageModel, ModelMessage, ToolSet } from "ai"
import type { Agent, Turn, TurnRequest } from "@minicode/core"
import type { PluginReference, PluginsConfig, ProviderId, ResolvedSdkConfig, SdkConfig } from "./config/schema"
import type { resolveRuntime } from "./providers/factory"
import type { SessionState, SessionSummary } from "./session/schema"

export type RuntimeOverride = {
  provider?: ProviderId
  model?: string
  openaiCompatible?: {
    name?: string
    baseURL?: string
    apiKey?: string
  }
}

export type RuntimeCatalog = {
  providers: Array<{
    id: ProviderId
    models: string[]
  }>
}

export type OpenSessionOptions = {
  id?: string
  createIfMissing?: boolean
  cwd?: string
  metadata?: Record<string, unknown>
  runtime?: RuntimeOverride
}

export type CreateMinicodeOptions = {
  cwd?: string
  env?: Record<string, string | undefined>
  configOverrides?: Partial<Omit<SdkConfig, "plugins">>
  experimental_modelFactory?: (input: {
    config: ResolvedSdkConfig
    runtime: ReturnType<typeof resolveRuntime>
  }) => LanguageModel
}

export type PluginMetadata = {
  reference: PluginReference
  id: string
  version?: string
}

export interface Session {
  readonly id: string
  readonly cwd: string
  readonly provider: ProviderId
  readonly model: string
  send: (prompt: string, options?: { abortSignal?: AbortSignal }) => Turn
  turn: (request: TurnRequest) => Turn
  snapshot: () => SessionState
}

export interface Minicode {
  readonly config: ResolvedSdkConfig
  getRuntimeCatalog(): RuntimeCatalog
  getLoadedPlugins(): Array<PluginMetadata>
  getTools(): ToolSet
  createAgent(runtime?: RuntimeOverride): Agent
  runTurn(input: { request: TurnRequest; transcript?: Array<ModelMessage>; runtime?: RuntimeOverride }): Turn
  openSession(options?: OpenSessionOptions): Promise<Session>
  listSessions(): Promise<SessionSummary[]>
  deleteSession(id: string): Promise<void>
}

export type { PluginReference, PluginsConfig, ProviderId, ResolvedSdkConfig, SdkConfig }
export type { SessionState, SessionSummary }
