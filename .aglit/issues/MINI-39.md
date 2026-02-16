---
schema: aglit.issue.md.v1
id: 019c4f3d-347d-7000-aa71-a3d50324e973
status: done
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Implement plugin contribution composition and conflict checks

## Description

- Implement plugin contribution composition with deterministic ordering and conflict detection.

## Acceptance

- Built-ins are composed before plugin contributions.
- Duplicate plugin id/tool/action/alias conflicts fail fast.
- Final composed contribution set is stable by config insertion order.

## Constraints

- No silent overrides in v0.
- Keep conflict messages explicit and actionable.

## Plan

1. Define composition accumulators for tools, instruction fragments, hooks, and actions.
2. Add duplicate/conflict guards at each merge point.
3. Preserve plugin registration order during composition.
4. Return composed payload plus metadata needed by SDK/CLI.

## Verification

- Test valid multi-plugin composition ordering.
- Test each conflict class and verify fail-fast behavior.

## Completed

- Extended SDK composition output to include plugin CLI actions in deterministic plugin registration order in `packages/sdk/src/plugins/compose.ts`.
- Added fail-fast conflict checks for duplicate plugin action ids and aliases (including intra-action duplicate aliases).
- Preserved built-in-first composition semantics while appending plugin contributions.
- Added composition coverage for action ordering and action conflict classes in `packages/sdk/src/plugins/compose.test.ts`.

## Verified

- `bun test packages/sdk/src/plugins/compose.test.ts`
- `bun test packages/sdk/src/plugins packages/sdk/src/sdk.test.ts`
