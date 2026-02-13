---
schema: aglit.issue.md.v1
id: 019c4f3d-3116-7000-b8ac-470396e65377
status: planned
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
