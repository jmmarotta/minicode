---
schema: aglit.issue.md.v1
id: 019c4f3d-325b-7000-907f-53f9006d656b
status: done
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement createMinicode composition and openSession flow

## Description

- Implement `createMinicode` composition root and `openSession` behavior for create/load/runtime-override flows.

## Acceptance

- `createMinicode()` initializes config, persistence, plugins, providers, tools, and core agent wiring.
- `openSession()` can create new sessions and load existing sessions.
- Runtime override rules are enforced (model-only on existing same-provider sessions).

## Constraints

- Keep composition internals hidden behind the `Minicode` interface.
- Preserve deterministic behavior for runtime switch semantics.

## Plan

1. Implement initialization pipeline in `sdk.ts`.
2. Implement `openSession`, `listSessions`, and `deleteSession` methods.
3. Wire persistence hooks for turn completion updates.
4. Surface loaded plugin metadata and runtime catalog.

## Verification

- Add integration smoke test for create/open/send/resume flows.
- Verify model switch and provider-new-session behavior matches documented rules.

## Completed

- Implemented `createMinicode` as the SDK composition root in `packages/sdk/src/sdk.ts`, wiring config loading, plugin loading/composition, provider runtime resolution, built-in tools, and persistence.
- Implemented full `openSession` flows for new sessions and existing session resume, including `createIfMissing` behavior.
- Enforced runtime override semantics for existing sessions: provider change is rejected, model override is allowed for same-provider sessions.
- Implemented `listSessions` and `deleteSession` on the public `Minicode` interface.
- Wired persistence via session snapshot hooks, including usage total accumulation and artifact reference persistence.
- Surfaced loaded plugin metadata and runtime catalog through `getLoadedPlugins()` and `getRuntimeCatalog()`.

## Verified

- `bun test packages/sdk/src/sdk.test.ts`
- `bun test packages/sdk/src`
- `bun run typecheck`
