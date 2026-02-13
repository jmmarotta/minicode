---
schema: aglit.issue.md.v1
id: 019c4f3d-34c5-7000-9ce7-4f74140ccdd6
status: planned
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
