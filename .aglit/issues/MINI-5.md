---
schema: aglit.issue.md.v1
id: 019c4f3d-2fa5-7000-8288-bbc8e75e7c6e
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Implement core agent runner and event stream mapping

## Description

- Implement the core runner that streams model events and exposes a normalized turn-event surface to the CLI.

## Acceptance

- A single turn streams text deltas and emits mapped step/finish events.
- Final `TurnResponse` contains response messages, finish reason, and usage.
- Event mapping is centralized and not duplicated in UI code.

## Constraints

- Hide raw AI SDK stream internals behind core abstractions.
- Keep event schema stable and minimal.

## Plan

1. Implement stream consumer over `fullStream`.
2. Map stream parts to `TurnEvent` values.
3. Aggregate final turn response from stream steps.
4. Expose runner through `Agent.runTurn`.

## Verification

- Run a smoke turn and verify delta, tool, and finish events are emitted.
- Confirm transcript append data comes from `responseMessages` only.

## Completed

- Implemented a new core runner surface under `packages/core/src/runner` with:
  - `createAgent(...).runTurn(...)`
  - normalized `TurnEvent` mapping in `events.ts`
  - stream consumer and final `TurnResponse` aggregation in `stream.ts`
- Centralized stream-part to event conversion in `mapStreamPartToTurnEvent` so UI code can consume stable events only.
- Final `TurnResponse` now aggregates:
  - streamed text
  - `responseMessages` from step response metadata
  - finish reason
  - total usage
- Added focused tests in `packages/core/src/runner/stream.test.ts` covering:
  - delta/tool/step/finish event emission
  - response aggregation from `response.messages`
  - normalized error event emission when stream consumption fails

## Verified

- `bun test packages/core/src/runner/stream.test.ts`
- `bunx oxlint --type-aware packages/core/src/index.ts packages/core/src/runner/*.ts`
- `bun run typecheck`
