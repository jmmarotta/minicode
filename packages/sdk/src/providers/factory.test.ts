import { describe, expect, test } from "bun:test"
import { ResolvedSdkConfigSchema, type ProviderId, type ResolvedSdkConfig } from "../config/schema"
import { createLanguageModel, resolveRuntime } from "./factory"

function createBaseConfig(): ResolvedSdkConfig {
  return ResolvedSdkConfigSchema.parse({
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    providerModels: {
      openai: ["gpt-4o-mini"],
      anthropic: ["claude-3-5-sonnet-latest"],
      google: ["gemini-2.5-flash"],
      "openai-compatible": ["qwen2.5-coder"],
    },
    apiKeys: {
      openai: "openai-key",
      anthropic: "anthropic-key",
      google: "google-key",
      "openai-compatible": "compat-key",
    },
    openaiCompatible: {
      name: "compat",
      baseURL: "https://compat.example/v1",
    },
  })
}

describe("createLanguageModel", () => {
  test("creates a runtime model for every supported provider", () => {
    const config = createBaseConfig()

    const providers: ProviderId[] = ["openai", "anthropic", "google", "openai-compatible"]
    for (const provider of providers) {
      const runtimeModel = createLanguageModel(config, {
        provider,
      })

      expect(runtimeModel.runtime.provider).toBe(provider)
      expect(typeof runtimeModel.runtime.model).toBe("string")
      expect(runtimeModel.model).toBeDefined()
    }
  })

  test("throws actionable errors for missing provider credentials", () => {
    const config = createBaseConfig()

    const cases: Array<{ provider: ProviderId; withoutKey: (config: ResolvedSdkConfig) => ResolvedSdkConfig }> = [
      {
        provider: "openai",
        withoutKey: (input) => ({
          ...input,
          apiKeys: {
            ...input.apiKeys,
            openai: undefined,
          },
        }),
      },
      {
        provider: "anthropic",
        withoutKey: (input) => ({
          ...input,
          apiKeys: {
            ...input.apiKeys,
            anthropic: undefined,
          },
        }),
      },
      {
        provider: "google",
        withoutKey: (input) => ({
          ...input,
          apiKeys: {
            ...input.apiKeys,
            google: undefined,
          },
        }),
      },
      {
        provider: "openai-compatible",
        withoutKey: (input) => ({
          ...input,
          apiKeys: {
            ...input.apiKeys,
            "openai-compatible": undefined,
          },
        }),
      },
    ]

    for (const input of cases) {
      const missingConfig = input.withoutKey(config)

      expect(() =>
        createLanguageModel(missingConfig, {
          provider: input.provider,
        }),
      ).toThrow("Missing API key")
    }
  })

  test("throws actionable error for missing openai-compatible baseURL", () => {
    const config = createBaseConfig()

    expect(() =>
      createLanguageModel(config, {
        provider: "openai-compatible",
        openaiCompatible: {
          baseURL: "",
        },
      }),
    ).toThrow("Missing base URL")
  })

  test("resolves provider override model from provider model catalog", () => {
    const config = createBaseConfig()

    const runtime = resolveRuntime(config, {
      provider: "google",
    })

    expect(runtime.provider).toBe("google")
    expect(runtime.model).toBe("gemini-2.5-flash")
  })
})
