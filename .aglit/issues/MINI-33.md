---
schema: aglit.issue.md.v1
id: 019c4f3d-33a2-7000-9345-5b4d7b2ac56d
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Wire new-session provider selection through runtime overrides

## Description

- Wire provider/model selection for new-session creation through runtime overrides.

## Acceptance

- Users can choose provider and model when creating a new session.
- Provider change always creates a new session id.
- Selection is exposed via both palette and slash command UX.

## Constraints

- Do not mutate provider on existing session ids.
- Keep runtime catalog-driven options in sync with SDK config.

## Plan

1. Add new-session action flow with runtime selection inputs.
2. Call `sdk.openSession({ runtime: { provider, model } })` for new sessions.
3. Update active session context and print selection summary.
4. Handle unsupported provider/model combinations gracefully.

## Verification

- Manual test creating new sessions across multiple providers.
- Confirm resumed old session retains original provider runtime.

## Completed

- Implemented new-session runtime selection in `packages/cli/src/app/commands.ts` with `--provider` and `--model` handling.
- Wired creation flow to `sdk.openSession({ runtime })` for provider/model override selection on new sessions.
- Added runtime catalog validation and session switch feedback printing.

## Verified

- `bun test packages/cli/src/app/commands.test.ts`
- `bun test packages/sdk/src/sdk.test.ts`
