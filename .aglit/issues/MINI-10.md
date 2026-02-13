---
schema: aglit.issue.md.v1
id: 019c4f3d-305f-7000-a799-0048491a3fc4
status: done
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Define core turn and event types with Zod schemas

## Description

- Define canonical core turn/event data types and corresponding Zod schemas for runtime validation and serialization.

## Acceptance

- `TurnRequest`, `TurnResponse`, and `TurnEvent` types are defined in core.
- Event union has schema coverage for each emitted event kind.
- Types are exported through the package public surface.

## Constraints

- Keep schemas provider-agnostic and stable for UI/logging.
- Avoid leaking AI SDK internal part shapes into public types.

## Plan

1. Define type unions for request/response/events.
2. Add Zod schemas and inferred types where applicable.
3. Align naming with plan conventions (`text_delta`, `tool_call`, etc.).
4. Export types from `src/index.ts`.

## Verification

- Typecheck imports from package consumers.
- Validate sample serialized events against schemas.

## Completed

- Added canonical Zod schemas for core runner contracts:
  - `TurnRequestSchema`
  - `TurnResponseSchema`
  - `TurnEventSchema`
  - supporting schemas (`TurnMessageSchema`, `TurnUsageSchema`, `SerializedErrorSchema`)
- Kept event naming aligned with conventions (`text_delta`, `tool_call`, `tool_result`, `tool_error`, `step_finish`, `finish`, `abort`, `error`).
- Exported new schemas and related types through the core public surface (`packages/core/src/runner/index.ts` and `packages/core/src/index.ts`).
- Added schema-focused tests to validate request/response shapes and every emitted event variant.

## Verified

- `bun run lint:check`
- `bun test`
- `bun run typecheck`
