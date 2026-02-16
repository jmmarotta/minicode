---
schema: aglit.issue.md.v1
id: 019c4f3d-3311-7000-857b-7308befb2f22
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Build app coordinator and in-flight turn queue

## Description

- Build the app coordinator and queue implementation that manages one active turn and FIFO submissions.

## Acceptance

- Exactly one turn is active at any moment.
- Additional submissions are queued and processed in order.
- Queue state transitions are visible and deterministic.

## Constraints

- Keep queue state ownership centralized in app layer.
- Avoid race conditions between submit, finish, and abort events.

## Plan

1. Implement queue data structure and turn lifecycle helpers.
2. Add coordinator flow for submit/start/finish/dequeue.
3. Integrate queue notifications (`[queued]`) into stdout rendering.
4. Handle edge cases for empty queue and rapid input.

## Verification

- Add tests for queue ordering and in-flight behavior.
- Manual stress test with rapid submissions during streaming.

## Completed

- Implemented centralized queue ownership in `packages/cli/src/app/queue.ts` with one-active-turn semantics and FIFO pending prompts.
- Integrated queue transitions into app coordination flow in `packages/cli/src/app/app.ts` (`beginOrQueue`, `settleActive`, dequeue logging).
- Added deterministic queue behavior tests in `packages/cli/src/app/queue.test.ts`.

## Verified

- `bun test packages/cli/src/app/queue.test.ts`
- `bun test packages/cli/src`
