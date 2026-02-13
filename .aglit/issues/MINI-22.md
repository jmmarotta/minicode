---
schema: aglit.issue.md.v1
id: 019c4f3d-3213-7000-a706-3dbf2415c915
status: done
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement artifact store for truncated outputs

## Description

- Implement artifact storage for large/truncated outputs so full data can be preserved outside model context.

## Acceptance

- SDK can persist text and byte artifacts per session.
- Artifact references include enough metadata for later retrieval/reporting.
- Built-in tools can offload large outputs through this store.

## Constraints

- Keep artifact API internal and minimal in v0.
- Avoid blocking turn rendering on artifact write failures.

## Plan

1. Define artifact store interface and reference types.
2. Implement filesystem-backed store with session-scoped directories.
3. Integrate store usage into shared tool truncation helpers.
4. Normalize artifact errors and fallback messaging.

## Verification

- Test writing text and binary artifacts and validate resulting references.
- Confirm large tool output paths produce truncation + artifact metadata.

## Completed

- Added internal artifact store abstractions and filesystem implementation in `packages/sdk/src/session/artifact-store.ts`.
- Added session-scoped artifact path helpers in `packages/sdk/src/session/paths.ts`.
- Added typed artifact references to SDK session schema (`artifacts`) and aligned persistence parsing.
- Integrated artifact-aware truncation in shared tool helpers (`packages/sdk/src/tools/shared.ts`) with non-blocking failure behavior.
- Wired built-in tools to offload large outputs through artifact store:
  - `packages/sdk/src/tools/read.ts`
  - `packages/sdk/src/tools/bash.ts`
- Wired SDK session apply-response path to collect artifact references from tool-result messages and persist them in session snapshots.

## Verified

- `bun test packages/sdk/src/session packages/sdk/src/tools`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
