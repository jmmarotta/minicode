import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { ProviderId, ResolvedSdkConfig } from "../config/schema"
import type { RuntimeCatalog, RuntimeOverride } from "../types"

type ResolvedRuntime = {
  provider: ProviderId
  model: string
  openaiCompatible: {
    name: string
    baseURL: string
    apiKey?: string
  }
}

const PROVIDER_ORDER: ProviderId[] = ["openai", "anthropic", "google", "openai-compatible"]

function firstModelForProvider(config: ResolvedSdkConfig, provider: ProviderId): string {
  const first = config.providerModels[provider][0]
  if (!first) {
    throw new Error(`No models configured for provider '${provider}'`)
  }
  return first
}

function requireApiKey(provider: ProviderId, value?: string): string {
  if (value) {
    return value
  }

  const envVar =
    provider === "openai" ? "OPENAI_API_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GOOGLE_API_KEY"

  throw new Error(`Missing API key for provider '${provider}'. Set config.apiKeys.${provider} or ${envVar}.`)
}

export function resolveRuntime(config: ResolvedSdkConfig, override?: RuntimeOverride): ResolvedRuntime {
  const provider = override?.provider ?? config.provider
  const model =
    override?.model ?? (provider === config.provider ? config.model : firstModelForProvider(config, provider))

  const openaiCompatible = {
    ...config.openaiCompatible,
    ...override?.openaiCompatible,
  }

  return {
    provider,
    model,
    openaiCompatible,
  }
}

export function createLanguageModel(
  config: ResolvedSdkConfig,
  override?: RuntimeOverride,
): {
  model: LanguageModel
  runtime: ResolvedRuntime
} {
  const runtime = resolveRuntime(config, override)

  switch (runtime.provider) {
    case "openai": {
      const apiKey = requireApiKey("openai", config.apiKeys.openai)
      const provider = createOpenAI({ apiKey })
      return {
        model: provider(runtime.model) as unknown as LanguageModel,
        runtime,
      }
    }

    case "anthropic": {
      const apiKey = requireApiKey("anthropic", config.apiKeys.anthropic)
      const provider = createAnthropic({ apiKey })
      return {
        model: provider(runtime.model) as unknown as LanguageModel,
        runtime,
      }
    }

    case "google": {
      const apiKey = requireApiKey("google", config.apiKeys.google)
      const provider = createGoogleGenerativeAI({ apiKey })
      return {
        model: provider(runtime.model) as unknown as LanguageModel,
        runtime,
      }
    }

    case "openai-compatible": {
      const provider = createOpenAICompatible({
        name: runtime.openaiCompatible.name,
        baseURL: runtime.openaiCompatible.baseURL,
        apiKey: runtime.openaiCompatible.apiKey ?? config.apiKeys["openai-compatible"],
      })

      return {
        model: provider(runtime.model) as unknown as LanguageModel,
        runtime,
      }
    }
  }
}

export function getRuntimeCatalog(config: ResolvedSdkConfig): RuntimeCatalog {
  return {
    providers: PROVIDER_ORDER.map((id) => ({
      id,
      models: [...config.providerModels[id]],
    })),
  }
}
