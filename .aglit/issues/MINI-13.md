---
schema: aglit.issue.md.v1
id: 019c4f3d-30ce-7000-a6de-3fc7fdec6ec4
status: planned
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Implement Agent wrapper around ToolLoopAgent

## Description

- Implement the `Agent` wrapper around ToolLoopAgent with immutable runtime configuration and `runTurn` execution.

## Acceptance

- `createAgent` returns an object implementing the core `Agent` interface.
- `runTurn` returns a turn handle with `events`, `response`, and `abort`.
- ToolLoopAgent and stream details are hidden from callers.

## Constraints

- Agent must remain stateless with respect to session transcript ownership.
- Keep initialization options minimal and explicit.

## Plan

1. Define agent interface and initialization inputs.
2. Compose internal ToolLoopAgent instance.
3. Connect run flow to turn factory/stream consumer.
4. Wire cancellation to abort controller behavior.

## Verification

- Run a smoke turn with streaming output and successful final response.
- Confirm callers can abort in-flight runs through turn handle.
