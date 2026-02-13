import type { PluginsConfig } from "../config/schema"
import { normalizePluginReference } from "./normalize"
import type { LoadedPlugin, MinicodePlugin, PluginContribution, PluginFactory, PluginSetupContext } from "./types"

type Logger = {
  info: (message: string, details?: unknown) => void
  warn: (message: string, details?: unknown) => void
  error: (message: string, details?: unknown) => void
}

type LoadPluginsOptions = {
  plugins: PluginsConfig
  cwd: string
  globalConfigDir: string
  sdkVersion: string
  logger?: Logger
}

function createError(reference: string, stage: string, message: string): Error {
  return new Error(`Plugin load failed [${stage}] ${reference}: ${message}`)
}

function assertPluginShape(reference: string, plugin: unknown): asserts plugin is MinicodePlugin {
  if (!plugin || typeof plugin !== "object") {
    throw createError(reference, "validate", "factory result must be an object")
  }

  const candidate = plugin as Record<string, unknown>

  if (typeof candidate.id !== "string" || !candidate.id.trim()) {
    throw createError(reference, "validate", "plugin.id must be a non-empty string")
  }

  if (candidate.apiVersion !== 1) {
    throw createError(reference, "validate", "plugin.apiVersion must be exactly 1")
  }

  if (candidate.setup && typeof candidate.setup !== "function") {
    throw createError(reference, "validate", "plugin.setup must be a function")
  }
}

function assertContributionShape(reference: string, contribution: unknown): asserts contribution is PluginContribution {
  if (!contribution || typeof contribution !== "object") {
    throw createError(reference, "validate", "setup() must return an object")
  }

  const sdk = (contribution as { sdk?: unknown }).sdk
  if (!sdk) {
    return
  }

  if (typeof sdk !== "object") {
    throw createError(reference, "validate", "contribution.sdk must be an object")
  }

  const tools = (sdk as { tools?: unknown }).tools
  if (tools && typeof tools !== "object") {
    throw createError(reference, "validate", "contribution.sdk.tools must be an object")
  }

  const instructionFragments = (sdk as { instructionFragments?: unknown }).instructionFragments
  if (
    instructionFragments &&
    (!Array.isArray(instructionFragments) || instructionFragments.some((item) => typeof item !== "string"))
  ) {
    throw createError(reference, "validate", "contribution.sdk.instructionFragments must be a string array")
  }
}

async function importPluginFactory(reference: string): Promise<PluginFactory> {
  let importedModule: unknown
  try {
    importedModule = await import(reference)
  } catch (error) {
    throw createError(reference, "import", error instanceof Error ? error.message : "import failed")
  }

  const factory = (importedModule as { default?: unknown }).default
  if (typeof factory !== "function") {
    throw createError(reference, "factory", "default export must be a function")
  }

  return factory as PluginFactory
}

export async function loadPlugins(options: LoadPluginsOptions): Promise<LoadedPlugin[]> {
  const logger: Logger =
    options.logger ||
    ({
      info: () => {},
      warn: () => {},
      error: () => {},
    } satisfies Logger)

  const seenNormalized = new Set<string>()
  const seenPluginIds = new Set<string>()

  const loaded: LoadedPlugin[] = []

  for (const [reference, pluginConfig] of Object.entries(options.plugins)) {
    const normalizedReference = normalizePluginReference(reference)

    if (seenNormalized.has(normalizedReference)) {
      throw createError(reference, "normalize", `duplicate normalized reference '${normalizedReference}'`)
    }
    seenNormalized.add(normalizedReference)

    const factory = await importPluginFactory(normalizedReference)

    let pluginResult: unknown
    try {
      pluginResult = await factory(pluginConfig)
    } catch (error) {
      throw createError(
        normalizedReference,
        "factory",
        error instanceof Error ? error.message : "factory execution failed",
      )
    }

    assertPluginShape(normalizedReference, pluginResult)

    if (seenPluginIds.has(pluginResult.id)) {
      throw createError(normalizedReference, "compose", `duplicate plugin id '${pluginResult.id}'`)
    }
    seenPluginIds.add(pluginResult.id)

    const context: PluginSetupContext = {
      reference: normalizedReference,
      cwd: options.cwd,
      globalConfigDir: options.globalConfigDir,
      sdkVersion: options.sdkVersion,
      logger,
    }

    let contribution: PluginContribution = {}
    if (pluginResult.setup) {
      try {
        contribution = (await pluginResult.setup(context)) || {}
      } catch (error) {
        throw createError(
          normalizedReference,
          "setup",
          error instanceof Error ? error.message : "setup execution failed",
        )
      }
    }

    assertContributionShape(normalizedReference, contribution)

    loaded.push({
      reference,
      normalizedReference,
      plugin: pluginResult,
      contribution,
    })
  }

  return loaded
}
