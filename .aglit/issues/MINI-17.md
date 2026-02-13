---
schema: aglit.issue.md.v1
id: 019c4f3d-315e-7000-8d85-1b09ffdd174e
status: planned
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Define SDK public types and explicit export surface

## Description

- Define SDK public interfaces/types and lock an explicit export surface for predictable consumer usage.

## Acceptance

- `src/types.ts` includes the planned public type/interface set.
- `src/index.ts` exports only the approved API surface.
- Core types are re-exported for SDK consumer convenience.

## Constraints

- Keep the surface small; avoid exporting internal helpers.
- Maintain naming consistency with core and plan docs.

## Plan

1. Author SDK type definitions and interface contracts.
2. Implement explicit exports in `index.ts`.
3. Remove accidental wildcard/internal exports.
4. Validate compile-time imports from a consumer context.

## Verification

- Typecheck with sample imports for all intended public symbols.
- Confirm internal-only modules are not reachable through root exports.
