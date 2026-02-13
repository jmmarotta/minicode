---
schema: aglit.issue.md.v1
id: 019c4f3d-3116-7000-b8ac-470396e65377
status: done
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Add core Zod schemas for session, events, outputs, and errors

## Description

- Add and finalize core Zod schemas for session state, event payloads, tool outputs, and serialized errors.

## Acceptance

- `SessionStateSchema`, `TurnEvent` schema, and `ToolOutputSchema` are implemented.
- Error serialization helper has a matching schema/type.
- Core load/save boundaries use schema validation consistently.

## Constraints

- Keep schemas forward-compatible where practical.
- Avoid provider-specific coupling in persisted formats.

## Plan

1. Define schema modules and inferred types.
2. Add schema validation at key boundary entrypoints.
3. Normalize error shape and expose helper.
4. Export schema values from package surface.

## Verification

- Parse valid fixtures and reject invalid fixtures with clear errors.
- Confirm persisted session payloads pass schema validation.

## Completed

- Added core session schema in `packages/core/src/session/session.ts`:
  - `SessionStateSchema` (forward-compatible via `z.looseObject`)
  - schema-backed `SessionState` type
- Tightened core runner schema definitions in `packages/core/src/runner/types.ts`:
  - strict object schemas for response/event/error envelopes
  - required-value handling for unknown payload fields (`content`, tool `input`/`output`)
- Tightened core tool output envelope in `packages/core/src/tools/output.ts` via strict schema.
- Added schema-backed error normalization in `packages/core/src/runner/errors.ts` so `serializeError(...)` always matches `SerializedErrorSchema`.
- Added and expanded tests:
  - `packages/core/src/session/session.test.ts` fixture validation tests for `SessionStateSchema`
  - `packages/core/src/runner/errors.test.ts` validation tests for serialized error shapes
- Updated SDK session boundary schemas in `packages/sdk/src/session/schema.ts` to enforce required persisted keys while allowing forward-compatible extras.

## Verified

- `bun test`
- `bun run lint:check`
- `bun run typecheck`
