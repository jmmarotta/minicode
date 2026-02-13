import path from "node:path"
import { createAgent, type Agent, type Turn } from "@minicode/core"
import type { LanguageModelUsage, ModelMessage } from "ai"
import { loadSdkConfig } from "./config/load"
import { createLanguageModel, getRuntimeCatalog, resolveRuntime } from "./providers/factory"
import { composeSdkContributions } from "./plugins/compose"
import { loadPlugins } from "./plugins/load"
import { FsSessionRepository } from "./session/fs-repository"
import { SessionStateSchema, type SessionState } from "./session/schema"
import { createBuiltinTools } from "./tools"
import type { CreateMinicodeOptions, Minicode, OpenSessionOptions, RuntimeOverride, Session } from "./types"

const SDK_VERSION = "0.1.0"
const USAGE_KEYS = ["inputTokens", "outputTokens", "totalTokens", "reasoningTokens", "cachedInputTokens"] as const

function normalizeSessionId(value?: string): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed
}

function cloneState(state: SessionState): SessionState {
  return SessionStateSchema.parse(structuredClone(state))
}

function requestMessagesForSession(request: Parameters<Agent["runTurn"]>[0]): Array<ModelMessage> {
  if ("messages" in request && request.messages) {
    return request.messages as Array<ModelMessage>
  }

  const prompt = request.prompt.trim()
  if (!prompt) {
    throw new Error("Turn request prompt must not be empty")
  }

  return [
    {
      role: "user",
      content: prompt,
    },
  ]
}

function mergeUsageTotals(
  current: SessionState["usageTotals"],
  totalUsage: LanguageModelUsage,
): SessionState["usageTotals"] {
  const merged: NonNullable<SessionState["usageTotals"]> = {
    ...current,
  }

  for (const key of USAGE_KEYS) {
    const value = totalUsage[key]
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue
    }

    merged[key] = (merged[key] ?? 0) + value
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

export async function createMinicode(options: CreateMinicodeOptions = {}): Promise<Minicode> {
  const cwd = path.resolve(options.cwd ?? process.cwd())

  const { config, paths } = await loadSdkConfig({
    cwd,
    env: options.env,
    configOverrides: options.configOverrides,
  })

  const loadedPlugins = await loadPlugins({
    plugins: config.plugins,
    cwd,
    globalConfigDir: paths.globalConfigDir,
    sdkVersion: SDK_VERSION,
  })

  const builtins = createBuiltinTools({ cwd, config })
  const composed = composeSdkContributions(builtins, loadedPlugins)
  const sessionRepository = new FsSessionRepository({
    sessionsDir: config.paths.sessionsDir,
  })

  const buildInstructions = (runtimeSelection: { provider: string; model: string }) => {
    const instructionParts = [
      `Provider: ${runtimeSelection.provider}`,
      `Model: ${runtimeSelection.model}`,
      ...composed.instructionFragments,
    ]

    return instructionParts.join("\n")
  }

  const createRuntimeAgent = (runtime?: RuntimeOverride): Agent => {
    const runtimeSelection = resolveRuntime(config, runtime)
    const model =
      options.experimental_modelFactory?.({
        config,
        runtime: runtimeSelection,
      }) ?? createLanguageModel(config, runtime).model

    return createAgent({
      model,
      tools: composed.tools as unknown as Parameters<typeof createAgent>[0]["tools"],
      instructions: buildInstructions(runtimeSelection),
    })
  }

  const createNewSessionState = (sessionId: string, openOptions: OpenSessionOptions = {}): SessionState => {
    const runtime = resolveRuntime(config, openOptions.runtime)
    const now = Date.now()

    return SessionStateSchema.parse({
      version: 1,
      id: sessionId,
      cwd: path.resolve(openOptions.cwd ?? cwd),
      createdAt: now,
      updatedAt: now,
      provider: runtime.provider,
      model: runtime.model,
      messages: [],
      metadata: openOptions.metadata,
    })
  }

  const applyOpenSessionOverrides = (state: SessionState, openOptions: OpenSessionOptions): SessionState => {
    let nextState = state
    let changed = false

    if (openOptions.runtime) {
      const provider = openOptions.runtime.provider ?? state.provider
      if (provider !== state.provider) {
        throw new Error(
          `Cannot change provider for existing session '${state.id}' (${state.provider} -> ${provider}). Create a new session instead.`,
        )
      }

      const model = openOptions.runtime.model?.trim()
      if (model && model !== state.model) {
        nextState = {
          ...nextState,
          model,
        }
        changed = true
      }
    }

    if (openOptions.metadata && Object.keys(openOptions.metadata).length > 0) {
      nextState = {
        ...nextState,
        metadata: {
          ...nextState.metadata,
          ...openOptions.metadata,
        },
      }
      changed = true
    }

    if (!changed) {
      return state
    }

    return SessionStateSchema.parse({
      ...nextState,
      updatedAt: Date.now(),
    })
  }

  const createSessionHandle = (initialState: SessionState): Session => {
    let state = cloneState(initialState)
    let persistQueue: Promise<void> = Promise.resolve()

    const saveState = async (nextState: SessionState) => {
      persistQueue = persistQueue.then(async () => {
        await sessionRepository.save(nextState)
        state = cloneState(nextState)
      })

      await persistQueue
    }

    const turn = (request: Parameters<Agent["runTurn"]>[0]): Turn => {
      const requestMessages = requestMessagesForSession(request)
      const runtime: RuntimeOverride = {
        provider: state.provider,
        model: state.model,
      }

      const run = createRuntimeAgent(runtime).runTurn(request, state.messages as Array<ModelMessage>)

      const response = run.response.then(async (result) => {
        const nextState = SessionStateSchema.parse({
          ...state,
          updatedAt: Date.now(),
          messages: [...state.messages, ...requestMessages, ...result.responseMessages],
          usageTotals: mergeUsageTotals(state.usageTotals, result.totalUsage),
        })

        await saveState(nextState)
        return result
      })

      return {
        events: run.events,
        response,
        abort: run.abort,
      }
    }

    return {
      get id() {
        return state.id
      },

      get cwd() {
        return state.cwd
      },

      get provider() {
        return state.provider
      },

      get model() {
        return state.model
      },

      send(prompt: string, runOptions?: { abortSignal?: AbortSignal }) {
        return turn({
          prompt,
          abortSignal: runOptions?.abortSignal,
        })
      },

      turn,

      snapshot() {
        return cloneState(state)
      },
    }
  }

  return {
    config,

    getRuntimeCatalog() {
      return getRuntimeCatalog(config)
    },

    getLoadedPlugins() {
      return loadedPlugins.map((loadedPlugin) => ({
        reference: loadedPlugin.normalizedReference,
        id: loadedPlugin.plugin.id,
        version: loadedPlugin.plugin.version,
      }))
    },

    getTools() {
      return composed.tools
    },

    createAgent(runtime?: RuntimeOverride) {
      return createRuntimeAgent(runtime)
    },

    runTurn(input: {
      request: Parameters<Agent["runTurn"]>[0]
      transcript?: Array<ModelMessage>
      runtime?: RuntimeOverride
    }): Turn {
      return createRuntimeAgent(input.runtime).runTurn(input.request, input.transcript)
    },

    async openSession(openOptions: OpenSessionOptions = {}): Promise<Session> {
      const requestedId = normalizeSessionId(openOptions.id)
      const createIfMissing = openOptions.createIfMissing ?? true

      let state: SessionState
      if (!requestedId) {
        state = createNewSessionState(Bun.randomUUIDv7(), openOptions)
        await sessionRepository.create(state)
        return createSessionHandle(state)
      }

      if (!(await sessionRepository.exists(requestedId))) {
        if (!createIfMissing) {
          throw new Error(`Session '${requestedId}' not found`)
        }

        state = createNewSessionState(requestedId, openOptions)
        await sessionRepository.create(state)
        return createSessionHandle(state)
      }

      state = await sessionRepository.load(requestedId)
      const updated = applyOpenSessionOverrides(state, openOptions)
      if (updated !== state) {
        await sessionRepository.save(updated)
        state = updated
      }

      return createSessionHandle(state)
    },

    async listSessions() {
      return sessionRepository.list()
    },

    async deleteSession(id: string) {
      const normalizedId = normalizeSessionId(id)
      if (!normalizedId) {
        throw new Error("Session id must not be empty")
      }

      await sessionRepository.delete(normalizedId)
    },
  }
}
