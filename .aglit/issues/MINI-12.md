---
schema: aglit.issue.md.v1
id: 019c4f3d-30aa-7000-b063-8e836dbadfba
status: done
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Build stream consumer for TurnEvent mapping and response aggregation

## Description

- Build the stream consumer that converts AI SDK stream parts into `TurnEvent` values and aggregates final turn response data.

## Acceptance

- Stream is consumed exactly once and emits normalized events.
- Response aggregation includes final text, response messages, usage, and finish reason.
- Abort and error paths are represented with dedicated events.

## Constraints

- Keep mapping logic in one module to avoid divergence.
- Preserve partial assistant output on interruption.

## Plan

1. Implement stream iterator adapter over AI SDK `fullStream`.
2. Add explicit mapping for each relevant stream part.
3. Aggregate response data from step finish/final events.
4. Expose consumer output to turn factory.

## Verification

- Test text delta, tool call/result, finish, abort, and error scenarios.
- Confirm aggregated `responseMessages` match expected transcript append data.

## Completed

- Updated stream consumer behavior in `packages/core/src/runner/stream.ts` to handle interruption paths explicitly:
  - normalize abort-like exceptions into `abort` events
  - preserve partial `text` when interrupted
  - aggregate fallback response fields (`finishReason`, `totalUsage`, `responseMessages`) on abort
- Kept mapping logic centralized in `packages/core/src/runner/events.ts` and stream aggregation in `packages/core/src/runner/stream.ts`.
- Expanded stream tests in `packages/core/src/runner/stream.test.ts` with coverage for:
  - abort part emission and partial text preservation
  - abort exception normalization
  - single-consumption of `fullStream`

## Verified

- `bun test packages/core/src/runner`
- `bun run lint:check`
- `bun run typecheck`
