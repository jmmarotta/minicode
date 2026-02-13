---
schema: aglit.project.md.v1
id: 019c4f3c-e5c3-7000-9348-2bb81e82a963
status: planned
priority: high
---

# SDK Package

## Description

Build `@minicode/sdk` as the composition layer for config, providers, tools, plugins, and persistence.

## Scope

- Provide a small `createMinicode()` API with session open/list/delete workflows.
- Implement Zod-first config loading and runtime override rules.
- Implement provider factory plus filesystem-backed sessions and artifacts.
- Compose built-in tools and global plugin contributions.

## Milestones

- Public export surface and types are locked.
- Config, providers, plugins, and persistence modules are in place.
- `createMinicode` and `openSession` run end-to-end with tests.

## Notes

- Source plan: `plans/sdk.md`.
