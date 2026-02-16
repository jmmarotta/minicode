---
schema: aglit.issue.md.v1
id: 019c4f3d-34c5-7000-9ce7-4f74140ccdd6
status: done
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Route plugin CLI actions into slash commands and palette

## Description

- Route plugin CLI actions into the same slash-command and palette paths used by built-in actions.

## Acceptance

- Plugin action ids/aliases are invokable through slash commands.
- Plugin actions are selectable from the command palette.
- Action execution context includes required helpers (`print`, `abortTurn`, session/runtime switching).

## Constraints

- Keep routing behavior consistent between built-in and plugin actions.
- Ensure plugin action errors are isolated from app/session lifecycle.

## Plan

1. Extend action registry to include plugin actions.
2. Map plugin aliases into slash parser resolution.
3. Surface plugin actions in palette list after built-ins.
4. Wrap action execution with safe error handling/reporting.

## Verification

- Manual test plugin actions via slash and palette triggers.
- Add integration test for shared routing path and context injection.

## Completed

- Added SDK `getCliActions()` to expose composed plugin CLI actions for CLI routing in `packages/sdk/src/types.ts` and `packages/sdk/src/sdk.ts`.
- Extended CLI command router in `packages/cli/src/app/commands.ts` to merge plugin actions after built-ins and route both slash and palette through the same execution path.
- Added plugin action alias resolution and execution context wiring (`print`, `abortTurn`, `switchSession`, `switchRuntime`).
- Added fast-fail duplicate command id/alias detection across built-in and plugin actions.
- Kept plugin action failures isolated via existing command execution error boundary.

## Verified

- `bun test packages/cli/src/app/commands.test.ts`
- `bun test packages/cli/src`
- `bun test packages/sdk/src/plugins packages/sdk/src/sdk.test.ts`
