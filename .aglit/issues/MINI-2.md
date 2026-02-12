---
schema: aglit.issue.md.v1
id: 019c4f3d-2f37-7000-b13c-dc9e7a226667
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Scaffold core, SDK, and CLI packages without deleting legacy code

## Description

- Scaffold `packages/core`, `packages/sdk`, and `packages/cli` with minimal entrypoints while leaving legacy code intact.

## Acceptance

- Each new package has `package.json`, `tsconfig.json`, and `src/index.ts` (or equivalent entry file).
- Workspace configuration recognizes the new packages.
- Existing implementation paths still run until migration is complete.

## Constraints

- No legacy directory deletion in this issue.
- Keep package boundaries aligned with the architecture plan.

## Plan

1. Create package folders and minimal TypeScript scaffolding.
2. Add workspace/package wiring for dependency resolution.
3. Add temporary bootstrap code that runs and exits cleanly.
4. Verify both new and legacy entrypoints can coexist.

## Verification

- Run package entrypoints and confirm they execute without runtime errors.
- Confirm repository still builds/lints with both old and new code present.

## Completed

- Added `packages/sdk` and `packages/cli` scaffolds with `package.json`, `tsconfig.json`, and `src/index.ts`.
- Verified new entrypoints run and exit cleanly:
  - `bun run packages/sdk/src/index.ts`
  - `bun run packages/cli/src/index.ts`
- Verified legacy core entrypoint still runs:
  - `bun run packages/core/src/index.ts <<< "exit"`
