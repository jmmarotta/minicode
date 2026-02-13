---
schema: aglit.issue.md.v1
id: 019c4f3d-30f2-7000-93ee-431ba4f1217f
status: planned
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
