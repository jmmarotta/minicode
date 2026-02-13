---
schema: aglit.issue.md.v1
id: 019c4f3d-34a1-7000-9971-0342545ac215
status: planned
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Expose loaded plugin metadata through SDK interface

## Description

- Expose loaded plugin metadata through the SDK interface for visibility and debugging.

## Acceptance

- `sdk.getLoadedPlugins()` returns reference/id/version metadata for loaded plugins.
- Metadata reflects normalized references and resolved plugin ids.
- Empty/no-plugin case is handled cleanly.

## Constraints

- Keep metadata output small and non-sensitive.
- Do not leak internal loader implementation details.

## Plan

1. Define loaded plugin metadata type in SDK public types.
2. Capture metadata during plugin load/compose stages.
3. Implement `getLoadedPlugins()` on `Minicode` implementation.
4. Add tests for populated and empty plugin states.

## Verification

- Call `getLoadedPlugins()` in a smoke flow and verify metadata shape.
- Confirm metadata ordering matches plugin configuration order.
