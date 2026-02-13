# SDK Package Plan

Date: 2026-02-06
Status: Draft plan for packages/sdk

This document defines `packages/sdk` as the batteries-included layer that composes:

- `@minicode/core` abstractions (`Agent`, `Session`, `Turn`)
- provider integration (OpenAI, Anthropic, Google, OpenAI-compatible)
- default toolset (`read`, `write`, `edit`, `bash`)
- file-backed session persistence and artifact storage
- config loading and normalization

Primary consumer in this repo is `packages/cli` (the interactive CLI + TUI app).

The design follows A Philosophy of Software Design:

- keep public APIs small and stable
- hide complex wiring and IO behind deep modules
- normalize naming and data flow across layers

---

## Scope

### In scope (v0)

- One primary entrypoint for users: `createMinicode()`
- Open/load/list/delete sessions
- Runtime overrides for new sessions and same-provider model switching
- Provider is immutable for an existing session in v0
- Global code-based plugin loading via plugin references
  (`@scope/plugin`, `file:///...`)
- Config via defaults + files + env + overrides, validated by Zod
- Provider factory for 4 provider families
- Default toolset built on core `defineTool` + `ToolOutput`
- Filesystem session repository and artifact store
- Allow-all runtime execution policy (no permission prompts/checks)

### Out of scope (v0)

- MCP integration
- Plugin marketplace/discovery/install flows
- Project-local plugin loading
- Background process orchestration
- Rich policy systems
- Permission prompting/approval flows
- Multiple runtime targets (Bun-only)

---

## Public Interface (SDK User Experience)

The SDK should feel simple for the 90% case:

```ts
import { createMinicode } from "@minicode/sdk"

const sdk = await createMinicode()
const session = await sdk.openSession()

const turn = session.send("summarize this repo")
for await (const event of turn.events) {
  // UI/logging layer handles rendering
}
const response = await turn.response

const switchedModel = await sdk.openSession({
  id: "my-session-id",
  runtime: { model: "gpt-5-mini" },
})

const anthropicSession = await sdk.openSession({
  runtime: { provider: "anthropic", model: "claude-sonnet-4-5" },
})
```

### Public values

- `createMinicode(options?)`
- `ProviderIdSchema`
- `PluginsConfigSchema`
- `SdkConfigSchema`
- `ResolvedSdkConfigSchema`

### Public interfaces and types

- `Minicode` (interface)
- `CreateMinicodeOptions` (type)
- `OpenSessionOptions` (type)
- `RuntimeOverride` (type)
- `RuntimeCatalog` (type)
- `PluginReference` (type)
- `PluginsConfig` (type)
- `ProviderId` (type)
- `SdkConfig` (type from zod)
- `ResolvedSdkConfig` (type from zod)
- `SessionSummary` (type)

### Re-exported core types (convenience)

- `Session`, `Turn`, `TurnRequest`, `TurnResponse`, `TurnEvent`, `ToolOutput`

---

## Type System Conventions

Use `interface` for behavioral boundaries:

- `Minicode`
- `SessionRepository` (internal)
- `ArtifactStore` (internal)

Use `type` for data and unions:

- `ProviderId`
- `OpenSessionOptions`
- `SessionSummary`

Use Zod schemas for boundary data and infer types from schemas where applicable:

- config load/merge outputs
- persisted session payloads (via core schema)
- tool input/output envelopes

---

## Exact Exported Surface

`packages/sdk/src/index.ts` should export exactly:

```ts
export { createMinicode } from "./sdk"

export { ProviderIdSchema, PluginsConfigSchema, SdkConfigSchema, ResolvedSdkConfigSchema } from "./config/schema"

export type {
  ProviderId,
  SdkConfig,
  ResolvedSdkConfig,
  CreateMinicodeOptions,
  OpenSessionOptions,
  RuntimeOverride,
  RuntimeCatalog,
  PluginReference,
  PluginsConfig,
  SessionSummary,
  Minicode,
} from "./types"

export type { Session, Turn, TurnRequest, TurnResponse, TurnEvent, ToolOutput } from "@minicode/core"
```

`packages/sdk/src/types.ts` should define:

```ts
export type ProviderId = import("@minicode/core").ProviderId

export type PluginReference = string
export type PluginConfig = Record<string, unknown>
export type PluginsConfig = Record<PluginReference, PluginConfig>

export type CreateMinicodeOptions = {
  cwd?: string
  configOverrides?: Partial<Omit<SdkConfig, "plugins">>
  env?: Record<string, string | undefined>
  agent?: {
    instructions?: string | SystemModelMessage | SystemModelMessage[]
    tools?: ToolSet
    stopWhen?: StopCondition | StopCondition[]
  }
}

export type OpenSessionOptions = {
  id?: string
  createIfMissing?: boolean // default: true
  cwd?: string
  metadata?: Record<string, unknown>
  runtime?: RuntimeOverride // existing session: model-only within same provider
}

export type RuntimeOverride = {
  provider?: ProviderId
  model?: string
  openaiCompatible?: {
    name?: string
    baseURL?: string
  }
}

export type RuntimeCatalog = {
  providers: Array<{
    id: ProviderId
    models: string[]
  }>
}

export type SessionSummary = {
  id: string
  cwd: string
  provider: ProviderId
  model: string
  createdAt: number
  updatedAt: number
}

export interface Minicode {
  readonly config: ResolvedSdkConfig
  getRuntimeCatalog(): RuntimeCatalog
  getLoadedPlugins(): Array<{ reference: PluginReference; id: string; version?: string }>
  openSession(options?: OpenSessionOptions): Promise<Session>
  listSessions(): Promise<SessionSummary[]>
  deleteSession(id: string): Promise<void>
}
```

---

## Config Model (Zod-first)

Config merge order:

1. defaults
2. global config (`~/.config/minicode/config.json`)
3. project config (`<cwd>/.minicode/config.json`)
4. environment variables
5. `createMinicode({ configOverrides })`

Plugin references are loaded from global config only. Project config and runtime
overrides cannot register plugins.

### Required schemas

- `ProviderIdSchema`
- `PluginReferenceSchema`
- `PluginsConfigSchema`
- `SdkConfigSchema`
- `ResolvedSdkConfigSchema`

### Key fields

- provider/model
- provider/model catalog for model switching and new-session runtime selection UI
- provider credentials and openai-compatible base URL/name
- plugins map (`plugins: Record<PluginReference, PluginConfig>`)
- tool limits (timeouts, max bytes, truncation rules)
- plugin hook limits (onTurnEvent timeout and timeout handling)
- path settings (config/sessions/artifacts dirs)
- agent defaults (max steps, optional instructions)

If any source is invalid, fail with a clear validation error path.

---

## Provider Factory

Single internal function:

- `createLanguageModel(config: ResolvedSdkConfig): LanguageModel`

Supported providers:

- OpenAI via `@ai-sdk/openai`
- Anthropic via `@ai-sdk/anthropic`
- Google via `@ai-sdk/google`
- OpenAI-compatible via `@ai-sdk/openai-compatible`

Normalization rules:

- no provider-specific options in the public API unless necessary
- provider-specific options stay in config and internal modules
- emit actionable errors for missing API keys/baseURL

---

## Plugin System (Global-only)

Detailed plugin module contract lives in plans/plugins.md.

Plugin configuration shape:

```json
{
  "plugins": {
    "@scope/plugin": {
      "option": true
    },
    "file:///Users/foo/plugin_dir": {}
  }
}
```

Reference format:

- npm/Bun package references (for globally installed dependencies)
- file URLs (`file:///...`) for local plugin directories/files

Loading pipeline:

1. Read `plugins` map from global config.
2. Normalize references (canonical file URLs, trimmed package names).
3. Resolve and import each reference with Bun module loading.
4. Validate plugin module export and contribution shape with Zod.
5. Merge contributions into SDK runtime (tools, instruction fragments,
   commands/palette actions where applicable).

Conflict policy:

- Duplicate plugin reference after normalization -> error.
- Duplicate plugin id -> error.
- Duplicate tool/command/palette id -> error.

Order policy:

- Plugin application order follows `Object.entries(plugins)` insertion order.
- Built-ins are composed first, then plugins in configured order.

Global-only policy:

- Project config plugin references are ignored.
- `createMinicode({ configOverrides })` cannot add plugin references.
- No marketplace/discovery/auto-install behavior in SDK.

---

## Tools (Built-ins)

All default tools are created through core `defineTool` and return `ToolOutput`.

### Shared guarantees

- Zod input schemas for all tools
- deterministic error behavior
- output truncation for model safety
- optional artifact persistence for full outputs
- avoid Gemini-problematic schema patterns (no unions/records in input)
- no permission checks in v0 (tools execute directly)

### Tool contracts

- `read(filePath, offset?, limit?)`
  - text-only read, line-numbered details
- `write(filePath, content)`
  - mkdir parent, overwrite file
- `edit(filePath, oldText, newText)`
  - exact one-match replacement, deterministic mismatch errors
- `bash(command, timeoutMs?)`
  - `bash -lc`, Bun spawn, timeout, stdout/stderr capture, exit code reporting

---

## Session and Artifact Persistence

### Session repository

Core boundary implemented by SDK:

```ts
interface SessionRepository {
  load(id: string): Promise<SessionState>
  save(state: SessionState): Promise<void>
  list(): Promise<SessionSummary[]>
  create(initial: SessionState): Promise<void>
  delete(id: string): Promise<void>
}
```

Implementation:

- `FsSessionRepository` (implements core `SessionRepository`)
- validates loads using core `SessionStateSchema`
- atomic writes (temp file + rename)

### Artifact store

Internal interface:

```ts
interface ArtifactStore {
  writeText(input: { sessionId: string; kind: string; content: string }): Promise<ArtifactRef>
  writeBytes(input: { sessionId: string; kind: string; data: Uint8Array; mediaType?: string }): Promise<ArtifactRef>
}
```

Used mainly by `bash` truncation in v0.
Implementation is `FsArtifactStore` in `src/artifacts/fs-store.ts`.

---

## Deep Module Composition (`sdk.ts`)

`createMinicode()` composition flow:

1. Resolve cwd and load config
2. Resolve paths and initialize repository/artifacts
3. Resolve and load plugins from global config references
4. Build language model from provider factory
5. Build default tools and compose plugin contributions
6. Create core Agent
7. Return `Minicode` interface implementation

`openSession()` flow:

1. load existing session, or create a new session when missing (`createIfMissing`
   defaults to true)
2. apply optional runtime override:
   - existing session: allow model override only if provider is unchanged
   - new session: allow provider/model/openai-compatible settings
3. create core Session with loaded transcript
4. hook session persistence on turn completion
5. persist updated runtime metadata for the session
6. return Session object

This keeps UI clients from wiring internals manually.

---

## Exact File List and Responsibilities

`packages/sdk/`

- `package.json`
  - dependencies and scripts for sdk package
- `tsconfig.json`
  - strict TS config

`src/`

- `index.ts`
  - canonical public export surface only
- `types.ts`
  - public SDK interfaces/types
- `sdk.ts`
  - createMinicode implementation and composition root

`src/config/`

- `schema.ts`
  - Zod schemas for config and inferred types
- `load.ts`
  - config loading/merge/validation and env mapping

`src/providers/`

- `types.ts`
  - internal normalized provider config types
- `factory.ts`
  - createLanguageModel from resolved config

`src/plugins/`

- `types.ts`
  - plugin reference, module, contribution, and loaded plugin types
- `schema.ts`
  - Zod schemas for plugin references and contribution envelopes
- `normalize.ts`
  - normalize plugin references (package/file URL canonicalization)
- `load.ts`
  - resolve/import plugin modules and validate exports
- `compose.ts`
  - merge plugin contributions and enforce conflict policy

`src/session/`

- `paths.ts`
  - resolve config/sessions/artifacts paths
- `fs-repository.ts`
  - filesystem session repository implementation

`src/artifacts/`

- `fs-store.ts`
  - artifact persistence implementation

`src/tools/`

- `index.ts`
  - createDefaultTools()
- `shared.ts`
  - truncation, serialization, helper utils
- `read.ts`
  - read tool
- `write.ts`
  - write tool
- `edit.ts`
  - edit tool
- `bash.ts`
  - bash tool

`src/util/`

- `errors.ts`
  - normalized error mapping for user-facing failures

---

## Implementation Phases

1. Define public types and export surface (`types.ts`, `index.ts`).
2. Implement config schemas and loader (`config/schema.ts`, `config/load.ts`).
3. Implement plugin schemas + loader + composition (`plugins/*`).
4. Implement provider factory (`providers/factory.ts`).
5. Implement session paths + fs repository (`session/*`).
6. Implement artifact store (`artifacts/fs-store.ts`).
7. Implement shared tool helpers and each built-in tool (`tools/*`).
8. Implement `createMinicode` composition (`sdk.ts`).
9. Add tests for config merge, plugin loading, provider resolution,
   repository behavior, truncation/artifact behavior, and a smoke flow for
   `openSession()`.

---

## Acceptance Criteria

- A user can call `createMinicode()` and `openSession()` with no manual wiring.
- Session persistence works across process restarts.
- Model switching within the same provider works without process restart.
- Selecting another provider opens a new session with the requested runtime.
- Default tools are available and return normalized `ToolOutput`.
- Plugins load from package and file URL references in global config.
- Plugin config is passed per reference from `plugins` map.
- Provider selection works for all 4 provider families.
- Invalid config fails early with clear Zod validation messages.
- Public export surface remains small and intentional.

---

## Risks and Mitigations

- OpenAI-compatible variability:
  - default to compatible tool behavior and conservative schemas
- Overgrown public surface:
  - keep export list explicit in `index.ts`
- Plugin conflicts and bad plugin exports:
  - Zod-validate plugin contributions and fail fast on conflicts
- Slow plugin hooks:
  - enforce per-hook timeout and continue execution without blocking the turn
- Tool output bloat:
  - strict truncation + artifact offloading
- Config drift:
  - single schema source + schema-driven defaults

---

## Suggested Plan Doc Outline (Reusable)

Use this structure for future package plans:

1. Purpose and scope
2. APOSD principles
3. Public API
4. Type conventions
5. Data/config schemas (Zod)
6. Internal modules and responsibilities
7. File list
8. Implementation phases
9. Acceptance criteria
10. Risks and mitigations
