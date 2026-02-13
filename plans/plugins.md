# Plugin Contract Plan

Date: 2026-02-06
Status: Draft contract for global code-based plugins

This document defines the plugin contract used by `@minicode/sdk` and consumed
by `packages/cli`.

The model is intentionally code-based (Neovim/OpenCode style):

- plugins are imported and executed as code
- no marketplace/discovery/auto-install logic
- plugins are loaded from global config only

---

## Goals

- Keep plugin configuration explicit and deterministic.
- Keep the public plugin API small but useful.
- Support Bun-resolved references:
  - package specifiers (e.g. `@scope/plugin`)
  - file URLs (e.g. `file:///Users/foo/plugin_dir`)
- Allow plugin-provided tools and CLI actions.
- Keep load/merge behavior predictable and easy to debug.

---

## Non-goals

- Marketplace/discovery/install workflows.
- Project-local plugin registration.
- Sandboxed plugin execution.
- Hot-reloading plugins in v0.

---

## Config Contract

Plugins are declared in global config only.

```json
{
  "plugins": {
    "@scope/plugin": {
      "enabled": true
    },
    "file:///Users/foo/plugin_dir": {}
  }
}
```

Rules:

- `plugins` is a map: `reference -> pluginConfig`.
- `reference` is the plugin identity in config and logs.
- `pluginConfig` is plugin-specific and validated by the plugin itself.
- Project config cannot add plugin references.

---

## Reference Normalization

Supported references:

- package references: `@scope/plugin`, `minicode-plugin-foo`
- file URLs: `file:///Users/foo/plugin_dir`

Normalization rules:

- Trim whitespace.
- For package references, keep exact specifier after trim.
- For file references:
  - accept `file:///...`
  - accept `file://Users/...` and normalize to canonical `file:///Users/...`
  - normalize path separators and remove redundant segments
- Use normalized references for deduplication and conflict checks.

---

## Plugin Module Entry Contract

Each plugin module must default-export a factory function.

```ts
export type PluginFactory = (config: Record<string, unknown>) => MinicodePlugin | Promise<MinicodePlugin>
```

Rationale:

- single export shape is simpler than supporting object-or-function variants
- plugin config map naturally feeds factory input

---

## Runtime Plugin Contract

```ts
export type MinicodePlugin = {
  id: string
  apiVersion: 1
  setup?: (ctx: PluginSetupContext) => PluginContribution | Promise<PluginContribution>
}
```

Required fields:

- `id`: stable plugin id (unique after load)
- `apiVersion`: exact API contract version

Optional field:

- `setup`: returns contribution payload

---

## Plugin Setup Context

```ts
export type PluginSetupContext = {
  reference: string
  sdkVersion: string
  globalConfigDir: string
  cwd: string
  logger: {
    debug: (msg: string, data?: unknown) => void
    info: (msg: string, data?: unknown) => void
    warn: (msg: string, data?: unknown) => void
    error: (msg: string, data?: unknown) => void
  }
}
```

Notes:

- Keep setup context minimal.
- Setup context should not expose raw persistence internals.

---

## Contribution Contract

```ts
export type PluginContribution = {
  sdk?: {
    tools?: ToolSet
    instructionFragments?: string[]
    onTurnEvent?: Array<(event: TurnEvent, ctx: { sessionId: string }) => void | Promise<void>>
  }
  cli?: {
    actions?: CliAction[]
  }
}
```

### CLI action contract

```ts
export type CliAction = {
  id: string
  title: string
  description?: string
  aliases?: string[]
  run: (ctx: CliActionContext) => Promise<void> | void
}

export type CliActionContext = {
  args: string
  print: (text: string) => void
  abortTurn: () => void
  switchSession: (input: { id?: string; createNew?: boolean }) => Promise<void>
  switchRuntime: (input: { provider?: ProviderId; model?: string }) => Promise<void>
}
```

CLI behavior:

- Built-in actions are registered first.
- Plugin actions are appended in plugin order.
- Slash and palette both route through the same action registry.

---

## Validation Rules

Use Zod and runtime checks at load time:

- Zod-validate config `plugins` map and normalized references.
- Runtime-check module default export is a function.
- Runtime-check plugin object shape (`id`, `apiVersion`).
- Zod-validate serializable contribution fields.
- Runtime-check function hooks (`run`, `onTurnEvent`) are callable.

Failure policy:

- Fail fast on invalid plugin contracts.
- Error message must include plugin reference and failing stage.

---

## Merge and Conflict Policy

Order:

- Iterate plugins using `Object.entries(plugins)` insertion order.
- Built-ins load first, plugins second.

Conflicts (fail fast):

- duplicate normalized reference
- duplicate plugin id
- duplicate tool name
- duplicate CLI action id or alias

No silent overrides in v0.

---

## Lifecycle

Load lifecycle:

1. Read global config.
2. Parse `plugins` map with Zod.
3. Normalize references.
4. Import plugin modules.
5. Call default factory with per-reference config.
6. Validate plugin object and contributions.
7. Compose SDK and CLI contribution registries.

Runtime lifecycle:

- dispatch each turn event to an async hook pipeline
- await `onTurnEvent` hooks in registration order within that pipeline
- keep hook execution off the critical render path for streaming output
- enforce per-hook timeout: default `1500ms` per event invocation
- on timeout, log a warning with plugin id/reference and continue
- after 3 consecutive hook timeouts in a turn, disable that plugin hook for the
  remainder of the turn
- isolate plugin hook failures (log error, continue runtime)

---

## Security Model

- Plugins run as trusted local code.
- Plugin loading is global-only to avoid executing arbitrary repo code.
- No sandboxing in v0.
- Users are responsible for trusted plugin references.
- Plugin tools/actions follow the same v0 runtime policy: no permission prompts.

---

## Error Reporting Contract

All plugin errors should include:

- normalized plugin reference
- plugin id (if available)
- stage (`normalize`, `import`, `factory`, `validate`, `compose`, `run`)
- concise message

This keeps failures actionable in CLI output and logs.

---

## Example Plugin

```ts
import { z } from "zod"

const ConfigSchema = z.object({
  greeting: z.string().default("hello"),
})

export default function plugin(config: Record<string, unknown>) {
  const parsed = ConfigSchema.parse(config)

  return {
    id: "example.greeting",
    apiVersion: 1 as const,
    setup() {
      return {
        cli: {
          actions: [
            {
              id: "greet",
              title: "Greet",
              run(ctx) {
                ctx.print(parsed.greeting)
              },
            },
          ],
        },
      }
    },
  }
}
```

---

## Implementation Checklist

- Add plugin schemas/types in `packages/sdk/src/plugins/schema.ts` and
  `packages/sdk/src/plugins/types.ts`.
- Implement normalizer in `packages/sdk/src/plugins/normalize.ts`.
- Implement importer/validator in `packages/sdk/src/plugins/load.ts`.
- Implement merge/conflict checks in `packages/sdk/src/plugins/compose.ts`.
- Expose plugin metadata via `sdk.getLoadedPlugins()`.
- Route plugin CLI actions in `packages/cli/src/app/commands.ts` and
  `packages/cli/src/ui/palette.ts`.
