---
schema: aglit.issue.md.v1
id: 019c4f3d-337d-7000-b23f-da8bd47fb2fd
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Wire same-provider model switching through SDK openSession

## Description

- Wire same-provider model switching for the active session through SDK `openSession` runtime overrides.

## Acceptance

- Switching models updates active session runtime when provider remains unchanged.
- Runtime change is reflected in session metadata and user-visible output.
- Invalid cross-provider in-session switch attempts are rejected clearly.

## Constraints

- Existing session provider remains immutable in v0.
- Keep switch flow available from both palette and slash command paths.

## Plan

1. Add model-switch action handler in command router.
2. Call `sdk.openSession({ id, runtime: { model } })` and replace active session handle.
3. Print clear runtime update feedback to stdout.
4. Handle failure cases with actionable messages.

## Verification

- Manual test model switch on active session and continue chatting.
- Test invalid switch attempts and confirm expected error handling.

## Completed

- Implemented model-switch command action in `packages/cli/src/app/commands.ts`.
- Wired same-provider model switching via `sdk.openSession({ id, runtime: { model } })` and active session replacement.
- Added provider-model validation against SDK runtime catalog and surfaced clear runtime update/error output.

## Verified

- `bun test packages/cli/src/app/commands.test.ts`
- `bun test packages/sdk/src/sdk.test.ts`
