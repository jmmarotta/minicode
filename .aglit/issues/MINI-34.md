---
schema: aglit.issue.md.v1
id: 019c4f3d-33c6-7000-aa66-6bd3a1180e00
status: canceled
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Wire plugin-contributed commands and palette actions

## Description

- Wire plugin-contributed CLI actions into both slash commands and palette action lists.

## Acceptance

- Plugin actions appear after built-ins in palette ordering.
- Slash router resolves plugin action ids/aliases.
- Plugin action failures are isolated and do not crash the app.

## Constraints

- Respect SDK plugin conflict policy.
- Maintain one unified action routing path.

## Plan

1. Read loaded plugin actions from SDK composition output.
2. Merge actions into shared registry with duplicate guardrails.
3. Expose merged registry to palette renderer and slash parser.
4. Add safe execution wrapper with error reporting.

## Verification

- Manual test plugin action invocation from palette and slash.
- Add tests for duplicate/conflicting action registration behavior.

## Triage Notes

- Superseded by `MINI-41`, which tracks the same plugin action routing work with a tighter acceptance contract (shared routing path + execution context guarantees).
- Plugin action support has not been implemented yet; keeping one source of truth avoids duplicated tracking.
