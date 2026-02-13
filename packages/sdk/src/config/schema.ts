import os from "node:os"
import path from "node:path"
import { z } from "zod"

export const ProviderIdSchema = z.enum(["openai", "anthropic", "google", "openai-compatible"])

export const PluginReferenceSchema = z.string().trim().min(1)

export const PluginConfigSchema = z.record(z.string(), z.unknown())

export const PluginsConfigSchema = z.record(PluginReferenceSchema, PluginConfigSchema)

export const ProviderModelsSchema = z.object({
  openai: z.array(z.string()).default(["gpt-4o-mini"]),
  anthropic: z.array(z.string()).default(["claude-3-5-sonnet-latest"]),
  google: z.array(z.string()).default(["gemini-2.5-flash"]),
  "openai-compatible": z.array(z.string()).default(["gpt-4o-mini"]),
})

export const ApiKeysSchema = z
  .object({
    openai: z.string().optional(),
    anthropic: z.string().optional(),
    google: z.string().optional(),
    "openai-compatible": z.string().optional(),
  })
  .default({})

export const OpenAICompatibleSchema = z
  .object({
    name: z.string().default("openai-compatible"),
    baseURL: z.string().default("http://localhost:11434/v1"),
    apiKey: z.string().optional(),
  })
  .default({
    name: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
  })

export const ToolLimitsSchema = z
  .object({
    maxReadBytes: z.number().int().positive().default(512_000),
    maxReadLines: z.number().int().positive().default(2_000),
    maxCommandOutputBytes: z.number().int().positive().default(64_000),
    defaultCommandTimeoutMs: z.number().int().positive().default(120_000),
  })
  .default({
    maxReadBytes: 512_000,
    maxReadLines: 2_000,
    maxCommandOutputBytes: 64_000,
    defaultCommandTimeoutMs: 120_000,
  })

const DEFAULT_SESSIONS_DIR = path.join(os.homedir(), ".local", "share", "minicode", "sessions")

export const PathsSchema = z
  .object({
    sessionsDir: z.string().trim().min(1).default(DEFAULT_SESSIONS_DIR),
  })
  .default({
    sessionsDir: DEFAULT_SESSIONS_DIR,
  })

export const SdkConfigSchema = z.object({
  provider: ProviderIdSchema.default("anthropic"),
  model: z.string().default("claude-3-5-sonnet-latest"),
  providerModels: ProviderModelsSchema.default({
    openai: ["gpt-4o-mini"],
    anthropic: ["claude-3-5-sonnet-latest"],
    google: ["gemini-2.5-flash"],
    "openai-compatible": ["gpt-4o-mini"],
  }),
  apiKeys: ApiKeysSchema,
  openaiCompatible: OpenAICompatibleSchema,
  plugins: PluginsConfigSchema.default({}),
  toolLimits: ToolLimitsSchema,
  paths: PathsSchema,
})

export const ResolvedSdkConfigSchema = SdkConfigSchema

export type SdkConfig = z.input<typeof SdkConfigSchema>
export type ResolvedSdkConfig = z.output<typeof ResolvedSdkConfigSchema>
export type ProviderId = z.infer<typeof ProviderIdSchema>
export type PluginReference = z.infer<typeof PluginReferenceSchema>
export type PluginsConfig = z.infer<typeof PluginsConfigSchema>
