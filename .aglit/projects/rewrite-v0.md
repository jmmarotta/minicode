---
schema: aglit.project.md.v1
id: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
status: planned
priority: high
---

# Minicode Rewrite v0

## Description

Coordinate the end-to-end v0 rewrite from the Bun-only plan in `plans/initial.md`.

## Scope

- Preserve current state while introducing the new core/sdk/cli package architecture.
- Land the tooling baseline (Turbo, Lefthook, Oxc, tsgo) and keep the repo runnable.
- Deliver an interactive CLI+TUI loop with streaming, tools, sessions, and palette actions.
- Remove legacy paths once the new implementation is stable.

## Milestones

- M0: launch `minicode` with stable footer input and scrollback output.
- M1-M3: stream model output, then validate tools across providers.
- M4: session persistence and resume flow.
- M5-M6: runtime switching and global plugin integration.

## Notes

- Source plan: `plans/initial.md`.
- Future backlog work is intentionally excluded from this project.
