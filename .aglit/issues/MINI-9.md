---
schema: aglit.issue.md.v1
id: 019c4f3d-303b-7000-a737-100c03522021
status: planned
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Remove legacy code and rewrite README for new architecture

## Description

- Remove legacy implementation paths once the new architecture is complete and update docs to reflect the new system.

## Acceptance

- Legacy-only directories/files are removed from the repo.
- `README.md` and key docs describe the new core/sdk/cli architecture.
- Main developer workflows run successfully on the new implementation only.

## Constraints

- Perform cleanup only after replacement functionality is verified.
- Avoid deleting shared assets still required by the new code.

## Plan

1. Identify legacy paths that are no longer referenced.
2. Remove obsolete code and update imports/scripts.
3. Rewrite architecture and usage documentation.
4. Run full project checks after cleanup.

## Verification

- Run lint/typecheck/tests after legacy removal.
- Verify docs and entrypoints point exclusively to the new architecture.
