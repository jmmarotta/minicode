---
schema: aglit.issue.md.v1
id: 019c4f3d-2ff0-7000-a7b0-da5b3347a83f
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Implement file-backed sessions and resume flow

## Description

- Implement persisted sessions so users can restart the CLI and resume prior conversations and runtime metadata.

## Acceptance

- New sessions are persisted to disk in the documented schema.
- Existing sessions can be loaded and resumed by id.
- Session updates are saved after turn completion.

## Constraints

- Validate loaded session data with Zod.
- Use atomic writes to avoid partial/corrupt session files.

## Plan

1. Implement filesystem session repository and path resolution.
2. Integrate repository with core session lifecycle hooks.
3. Persist runtime metadata and transcript updates.
4. Add resume flow to CLI startup path.

## Verification

- Start a conversation, restart CLI, and resume the same session id.
- Inspect stored session JSON and confirm schema fields are present.

## Progress

- Added SDK session persistence foundations first (schema, path resolution, filesystem repository) and then wired open/resume lifecycle APIs.
- Added CLI startup resume integration through `--session` / `--new-session` parsing with startup session resolution.
- Added automated tests that cover persistence, resume by id, and runtime-override constraints.

## Completed

- Implemented file-backed session schema and repository with Zod validation and atomic writes:
  - `packages/sdk/src/session/schema.ts`
  - `packages/sdk/src/session/paths.ts`
  - `packages/sdk/src/session/fs-repository.ts`
- Extended SDK config to include session path defaults and env override support:
  - `packages/sdk/src/config/schema.ts` (`paths.sessionsDir`)
  - `packages/sdk/src/config/load.ts` (`MINICODE_SESSIONS_DIR`)
- Implemented SDK session lifecycle APIs and persistence hooks:
  - `packages/sdk/src/sdk.ts`
    - `openSession`, `listSessions`, `deleteSession`
    - turn completion persistence with transcript + usage totals updates
    - same-session model override support and provider-change rejection
  - `packages/sdk/src/types.ts` (session interfaces and options)
  - `packages/sdk/src/index.ts` (session schema/types exports)
- Added CLI startup resume flow:
  - `packages/cli/src/index.ts` (basic `--session` / `--new-session` parsing and startup open/resume)
  - `packages/cli/tsconfig.json` (path alias required by new SDK/core type imports)
- Added tests for persisted-session and resume behavior:
  - `packages/sdk/src/sdk.test.ts`

## Verified

- `bun test packages/sdk/src/sdk.test.ts`
- `bunx oxlint --type-aware packages/sdk/src/**/*.ts packages/cli/src/index.ts`
- `bun run typecheck`
