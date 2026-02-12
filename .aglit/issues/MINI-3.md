---
schema: aglit.issue.md.v1
id: 019c4f3d-2f5b-7000-a427-b28630cf6e25
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Establish repo tooling baseline (Turbo, Lefthook, Oxc, tsgo)

## Description

- Establish the v0 tooling baseline with Turbo, Lefthook, Oxc tooling, and `tsgo`-based type checking.

## Acceptance

- Root scripts for format, lint, and typecheck reflect the target tooling stack.
- Hook configuration runs the intended checks at pre-commit and pre-push.
- CI/local developer flow no longer depends on `tsc` scripts.

## Constraints

- Keep command ergonomics simple for contributors.
- Avoid introducing redundant tooling overlap.

## Plan

1. Add/update tooling dependencies and root scripts.
2. Configure Turbo tasks for shared and package-level workflows.
3. Add Lefthook config and install hook integration.
4. Validate end-to-end formatting, linting, and typechecking.

## Verification

- Run `bun run fmt:check`, `bun run lint:check`, and `bun run typecheck` successfully.
- Confirm hooks are installed and executable on a local commit flow.

## Completed

- Updated root scripts to use `oxfmt`, `oxlint`, and `bun turbo typecheck`.
- Added Turbo task entries for format, lint, typecheck, build, and test.
- Added `lefthook.yml` and installed hooks via root `postinstall` script.
- Verified:
  - `bun run fmt:check`
  - `bun run lint:check`
  - `bun run typecheck`
