---
schema: aglit.issue.md.v1
id: 019c4f3d-335a-7000-8627-c57e7ade2131
status: planned
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Add command palette and slash command parity

## Description

- Add command palette support and slash-command parity for core app actions.

## Acceptance

- Palette includes built-in actions: new, switch session, switch model, abort, help, exit.
- Slash command router supports equivalent built-in commands.
- Both interfaces route through the same action execution layer.

## Constraints

- Keep palette in footer region (not fullscreen).
- Maintain consistent command semantics across entry methods.

## Plan

1. Implement action registry and shared command execution interface.
2. Build palette UI state and selection handling.
3. Implement slash parser and argument mapping.
4. Hook actions into coordinator and SDK operations.

## Verification

- Manual test each action through both palette and slash paths.
- Add routing tests to ensure consistent resolution behavior.
