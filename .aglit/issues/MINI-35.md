---
schema: aglit.issue.md.v1
id: 019c4f3d-33eb-7000-8c61-e38ca32411cf
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Add CLI tests for args, queue, command routing, and event rendering

## Description

- Add CLI package tests for argument parsing, queue semantics, command routing, plugin action routing, and event rendering.

## Acceptance

- Tests cover primary happy paths and key edge cases for all targeted modules.
- Queue and routing behavior is deterministic in test runs.
- Event rendering output remains stable across event kinds.

## Constraints

- Keep tests focused and fast for iterative development.
- Avoid brittle snapshot-heavy assertions unless necessary.

## Plan

1. Add parser tests for CLI flags and validation errors.
2. Add queue tests for in-flight and FIFO behavior.
3. Add command registry/routing tests including plugin actions.
4. Add renderer tests for turn event mapping outputs.

## Verification

- Run CLI package tests and confirm all new coverage passes.
- Confirm failures produce clear diagnostics for routing/queue regressions.

## Completed

- Added CLI parsing/validation/startup tests in:
  - `packages/cli/src/cli/args.test.ts`
  - `packages/cli/src/cli/schema.test.ts`
  - `packages/cli/src/cli/start.test.ts`
- Added queue semantics tests in `packages/cli/src/app/queue.test.ts`.
- Added command routing tests in `packages/cli/src/app/commands.test.ts`, including plugin action slash/palette routing, helper context usage, and failure isolation.
- Added event rendering stability tests in `packages/cli/src/ui/event-renderer.test.ts`.

## Verified

- `bun test packages/cli/src`
