import path from "node:path"
import { createAgent, createSession, type Agent, type Turn } from "@minicode/core"
import type { LanguageModelUsage, ModelMessage } from "ai"
import { loadSdkConfig } from "./config/load"
import { createLanguageModel, getRuntimeCatalog, resolveRuntime } from "./providers/factory"
import { composeSdkContributions } from "./plugins/compose"
import { loadPlugins } from "./plugins/load"
import { ArtifactReferenceSchema, FsArtifactStore } from "./session/artifact-store"
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

function extractArtifactReferences(responseMessages: Array<unknown>): NonNullable<SessionState["artifacts"]> {
  const artifacts: NonNullable<SessionState["artifacts"]> = []

  for (const message of responseMessages) {
    if (!message || typeof message !== "object" || !("content" in message)) {
      continue
    }

    const content = (message as { content?: unknown }).content
    if (!Array.isArray(content)) {
      continue
    }

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue
      }

      const record = part as Record<string, unknown>
      if (record.type !== "tool-result") {
        continue
      }

      const output = record.output
      if (!output || typeof output !== "object") {
        continue
      }

      const meta = (output as { meta?: unknown }).meta
      if (!meta || typeof meta !== "object") {
        continue
      }

      const parsed = ArtifactReferenceSchema.safeParse((meta as { artifact?: unknown }).artifact)
      if (parsed.success) {
        artifacts.push(parsed.data)
      }
    }
  }

  return artifacts
}

function mergeArtifacts(
  current: SessionState["artifacts"],
  additional: NonNullable<SessionState["artifacts"]>,
): SessionState["artifacts"] {
  if (additional.length === 0) {
    return current
  }

  const byId = new Map<string, NonNullable<SessionState["artifacts"]>[number]>()
  for (const artifact of current ?? []) {
    byId.set(artifact.id, artifact)
  }
  for (const artifact of additional) {
    byId.set(artifact.id, artifact)
  }

  return [...byId.values()]
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

  const artifactStore = new FsArtifactStore({
    sessionsDir: config.paths.sessionsDir,
  })

  const builtins = createBuiltinTools({ cwd, config, artifactStore })
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

  const createRuntimeAgent = (runtime?: RuntimeOverride, context?: unknown): Agent => {
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
      context,
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

    const coreSession = createSession<SessionState>({
      state,
      runTurn(request, transcript) {
        const runtime: RuntimeOverride = {
          provider: state.provider,
          model: state.model,
        }

        return createRuntimeAgent(runtime, { sessionId: state.id }).runTurn(request, transcript as Array<ModelMessage>)
      },
      applyResponse({ previousState, nextState, response }) {
        return SessionStateSchema.parse({
          ...nextState,
          usageTotals: mergeUsageTotals(previousState.usageTotals, response.totalUsage),
          artifacts: mergeArtifacts(nextState.artifacts, extractArtifactReferences(response.responseMessages)),
        })
      },
      async onSnapshot(snapshot) {
        await saveState(snapshot)
      },
    })

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
        return coreSession.send(prompt, {
          abortSignal: runOptions?.abortSignal,
        })
      },

      turn(request) {
        return coreSession.turn(request)
      },

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

    getCliActions() {
      return composed.cliActions.map((action) => ({
        ...action,
        aliases: [...action.aliases],
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
