---
schema: aglit.project.md.v1
id: 019c4f3c-e605-7000-aa39-67c68535a0b1
status: planned
priority: medium
---

# Plugin System

## Description

Implement the global code-based plugin contract and runtime composition flow used by the SDK and CLI.

## Scope

- Define plugin schemas/types and reference normalization rules.
- Load plugin modules, validate contracts, and fail fast on invalid shape.
- Compose tools/actions with conflict checks and deterministic order.
- Expose plugin metadata and route plugin actions through CLI command surfaces.

## Milestones

- Plugin contract and normalization are implemented.
- Load/validate/compose pipeline is stable.
- Plugin actions are visible in slash and palette paths.

## Notes

- Source plan: `plans/plugins.md`.
