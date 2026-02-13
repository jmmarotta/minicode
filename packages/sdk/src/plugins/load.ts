import type { PluginsConfig } from "../config/schema"
import { MinicodePluginSchema, PluginContributionSchema } from "./schema"
import { normalizePluginReference } from "./normalize"
import type { LoadedPlugin, MinicodePlugin, PluginContribution, PluginFactory, PluginSetupContext } from "./types"
import { ZodError } from "zod"

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

function formatZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>"
      return `${issuePath}: ${issue.message}`
    })
    .join("; ")
}

function parsePluginShape(reference: string, plugin: unknown): MinicodePlugin {
  const parsed = MinicodePluginSchema.safeParse(plugin)
  if (!parsed.success) {
    throw createError(reference, "validate", `invalid plugin contract (${formatZodIssues(parsed.error)})`)
  }

  return parsed.data as MinicodePlugin
}

function parseContributionShape(reference: string, contribution: unknown): PluginContribution {
  const normalizedContribution = contribution ?? {}
  const parsed = PluginContributionSchema.safeParse(normalizedContribution)
  if (!parsed.success) {
    throw createError(reference, "validate", `invalid contribution contract (${formatZodIssues(parsed.error)})`)
  }

  return parsed.data as PluginContribution
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

    const plugin = parsePluginShape(normalizedReference, pluginResult)

    if (seenPluginIds.has(plugin.id)) {
      throw createError(normalizedReference, "compose", `duplicate plugin id '${plugin.id}'`)
    }
    seenPluginIds.add(plugin.id)

    const context: PluginSetupContext = {
      reference: normalizedReference,
      cwd: options.cwd,
      globalConfigDir: options.globalConfigDir,
      sdkVersion: options.sdkVersion,
      logger,
    }

    let contribution: PluginContribution = {}
    if (plugin.setup) {
      let setupResult: unknown
      try {
        setupResult = await plugin.setup(context)
      } catch (error) {
        throw createError(
          normalizedReference,
          "setup",
          error instanceof Error ? error.message : "setup execution failed",
        )
      }

      contribution = parseContributionShape(normalizedReference, setupResult)
    }

    loaded.push({
      reference,
      normalizedReference,
      plugin,
      contribution,
    })
  }

  return loaded
}
