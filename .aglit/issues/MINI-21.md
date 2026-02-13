---
schema: aglit.issue.md.v1
id: 019c4f3d-31ee-7000-8757-7c637bf1daa2
status: planned
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
