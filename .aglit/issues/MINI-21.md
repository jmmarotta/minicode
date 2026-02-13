---
schema: aglit.issue.md.v1
id: 019c4f3d-31ee-7000-8757-7c637bf1daa2
status: done
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement session path resolution and filesystem repository

## Description

- Implement session path resolution and a filesystem repository for create/load/save/list/delete operations.

## Acceptance

- Session files are created under resolved data paths with stable layout.
- Repository supports CRUD operations and summary listing.
- Session loads validate against core `SessionStateSchema`.

## Constraints

- Use atomic writes for persistence safety.
- Keep path logic centralized in a dedicated module.

## Plan

1. Implement `session/paths.ts` for config/data directory resolution.
2. Implement `FsSessionRepository` CRUD methods.
3. Add schema validation and normalized error handling.
4. Add list-summary mapping for CLI consumption.

## Verification

- Integration test create/load/save/delete lifecycle on disk.
- Confirm invalid/corrupt session file handling is explicit and safe.

## Completed

- Kept session path resolution centralized in `packages/sdk/src/session/paths.ts` and added dedicated path tests (`paths.test.ts`).
- Implemented and validated filesystem repository lifecycle behavior in `packages/sdk/src/session/fs-repository.ts`:
  - create/load/save/list/delete
  - atomic writes via temp file + rename
  - explicit handling of missing session directory during list
- Ensured session persistence schema aligns with core base schema by composing SDK `SessionStateSchema` from core `SessionStateSchema`.
- Added repository integration tests in `packages/sdk/src/session/fs-repository.test.ts` for:
  - CRUD + summary listing
  - corrupt JSON and schema-invalid file errors

## Verified

- `bun test packages/sdk/src/session`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
