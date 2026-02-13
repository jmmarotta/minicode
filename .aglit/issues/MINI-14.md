---
schema: aglit.issue.md.v1
id: 019c4f3d-30f2-7000-93ee-431ba4f1217f
status: done
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Implement Session transcript ownership and snapshot hooks

## Description

- Implement `Session` as the transcript owner that sends turns, applies completion deltas, and exposes snapshot state.

## Acceptance

- `Session.send` and `Session.turn` create turn handles backed by the configured agent.
- On completion, response messages are appended to the transcript.
- `snapshot()` returns valid `SessionState` ready for persistence.

## Constraints

- Session handles state; agent remains stateless.
- Preserve partial output and interruption marker semantics on abort.

## Plan

1. Implement session constructor and state container.
2. Wire `send` convenience and low-level `turn` entrypoint.
3. Append response deltas on turn completion and update timestamps.
4. Integrate optional repository hooks.

## Verification

- Execute multiple turns and confirm transcript growth is deterministic.
- Abort a turn and verify partial assistant text plus interruption marker behavior.

## Completed

- Added a new core session module in `packages/core/src/session/session.ts` with transcript ownership and turn orchestration.
- Implemented `createSession(...)` with:
  - `send(prompt)` and `turn(request)` APIs backed by a configured turn runner
  - transcript append-on-complete behavior
  - `snapshot()` state cloning for persistence-ready reads
  - optional `onSnapshot` and `applyResponse` hooks for repository/persistence integration
- Implemented abort semantics in session commit logic:
  - preserve partial assistant output when needed
  - append user interruption marker (`[interrupted by user]` by default)
- Added exports via `packages/core/src/session/index.ts` and top-level `packages/core/src/index.ts`.
- Integrated SDK session handling with core session ownership in `packages/sdk/src/sdk.ts` while preserving SDK usage totals persistence logic.

## Verified

- `bun test packages/core/src/session`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
