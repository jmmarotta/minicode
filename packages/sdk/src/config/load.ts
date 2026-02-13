import os from "node:os"
import path from "node:path"
import { ZodError } from "zod"
import { ResolvedSdkConfigSchema, type ResolvedSdkConfig, type SdkConfig } from "./schema"

type ConfigObject = Record<string, unknown>

export type ConfigPaths = {
  globalConfigPath: string
  projectConfigPath: string
  globalConfigDir: string
}

export type LoadSdkConfigOptions = {
  cwd: string
  env?: Record<string, string | undefined>
  configOverrides?: Partial<Omit<SdkConfig, "plugins">>
}

function isRecord(value: unknown): value is ConfigObject {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function mergeConfig(base: ConfigObject, next: ConfigObject): ConfigObject {
  const merged: ConfigObject = { ...base }

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      continue
    }

    const current = merged[key]
    if (isRecord(current) && isRecord(value)) {
      merged[key] = mergeConfig(current, value)
      continue
    }

    merged[key] = value
  }

  return merged
}

async function readConfigFile(filePath: string): Promise<ConfigObject> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return {}
  }

  const text = await file.text()
  if (!text.trim()) {
    return {}
  }

  const parsed = JSON.parse(text) as unknown
  if (!isRecord(parsed)) {
    throw new Error(`Config file must contain a JSON object: ${filePath}`)
  }

  return parsed
}

function envToConfig(env: Record<string, string | undefined>): ConfigObject {
  const result: ConfigObject = {}

  if (env.MINICODE_PROVIDER) {
    result.provider = env.MINICODE_PROVIDER
  }

  if (env.MINICODE_MODEL) {
    result.model = env.MINICODE_MODEL
  }

  const apiKeys: ConfigObject = {}
  if (env.OPENAI_API_KEY) {
    apiKeys.openai = env.OPENAI_API_KEY
  }
  if (env.ANTHROPIC_API_KEY) {
    apiKeys.anthropic = env.ANTHROPIC_API_KEY
  }
  if (env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY) {
    apiKeys.google = env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY
  }
  if (env.OPENAI_COMPATIBLE_API_KEY) {
    apiKeys["openai-compatible"] = env.OPENAI_COMPATIBLE_API_KEY
  }
  if (Object.keys(apiKeys).length > 0) {
    result.apiKeys = apiKeys
  }

  const openaiCompatible: ConfigObject = {}
  if (env.OPENAI_COMPATIBLE_BASE_URL) {
    openaiCompatible.baseURL = env.OPENAI_COMPATIBLE_BASE_URL
  }
  if (env.OPENAI_COMPATIBLE_NAME) {
    openaiCompatible.name = env.OPENAI_COMPATIBLE_NAME
  }
  if (env.OPENAI_COMPATIBLE_API_KEY) {
    openaiCompatible.apiKey = env.OPENAI_COMPATIBLE_API_KEY
  }
  if (Object.keys(openaiCompatible).length > 0) {
    result.openaiCompatible = openaiCompatible
  }

  if (env.MINICODE_SESSIONS_DIR) {
    result.paths = {
      sessionsDir: env.MINICODE_SESSIONS_DIR,
    }
  }

  return result
}

function assertNoPlugins(sourceName: string, value: ConfigObject) {
  if (!Object.hasOwn(value, "plugins")) {
    return
  }

  throw new Error(`Plugin references are global-only. Remove 'plugins' from ${sourceName}.`)
}

export function resolveConfigPaths(cwd: string, env: Record<string, string | undefined> = process.env): ConfigPaths {
  const globalConfigPath = env.MINICODE_GLOBAL_CONFIG || path.join(os.homedir(), ".config", "minicode", "config.json")
  const projectConfigPath = path.join(cwd, ".minicode", "config.json")

  return {
    globalConfigPath,
    projectConfigPath,
    globalConfigDir: path.dirname(globalConfigPath),
  }
}

export async function loadSdkConfig(options: LoadSdkConfigOptions): Promise<{
  config: ResolvedSdkConfig
  paths: ConfigPaths
}> {
  const env = options.env ?? process.env
  const paths = resolveConfigPaths(options.cwd, env)

  const [globalConfigRaw, projectConfigRaw] = await Promise.all([
    readConfigFile(paths.globalConfigPath),
    readConfigFile(paths.projectConfigPath),
  ])

  assertNoPlugins("project config", projectConfigRaw)

  const overrides = (options.configOverrides ?? {}) as ConfigObject
  assertNoPlugins("config overrides", overrides)

  const envConfig = envToConfig(env)

  const globalWithoutPlugins = { ...globalConfigRaw }
  delete globalWithoutPlugins.plugins

  const mergedWithoutPlugins = mergeConfig(
    mergeConfig(mergeConfig(mergeConfig(globalWithoutPlugins, projectConfigRaw), envConfig), overrides),
    { plugins: globalConfigRaw.plugins },
  )

  let resolved: ResolvedSdkConfig
  try {
    resolved = ResolvedSdkConfigSchema.parse(mergedWithoutPlugins)
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((issue) => {
          const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>"
          return `${issuePath}: ${issue.message}`
        })
        .join("; ")
      throw new Error(`Invalid SDK config: ${details}`)
    }

    throw error
  }

  return {
    config: resolved,
    paths,
  }
}
