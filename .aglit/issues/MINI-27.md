---
schema: aglit.issue.md.v1
id: 019c4f3d-32c9-7000-8c4d-608b62be93a4
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Implement CLI args parsing, Zod validation, and startup bootstrap

## Description

- Implement CLI argument parsing, Zod validation, and startup bootstrap to initialize SDK/session state.

## Acceptance

- Flags (`--session`, `--new-session`, `--provider`, `--model`, `--footer-height`, `--cwd`) parse correctly.
- Invalid args fail with clear validation messages.
- Startup flow creates SDK and opens the appropriate session.

## Constraints

- Keep parsing logic separated from app runtime logic.
- Preserve documented runtime override semantics.

## Plan

1. Add raw argv normalization in `cli/args.ts`.
2. Add Zod schemas and coercion rules in `cli/schema.ts`.
3. Implement startup orchestration in `cli/start.ts`.
4. Route validated options into SDK `openSession` calls.

## Verification

- Add arg parsing tests for valid/invalid combinations.
- Manual smoke run with representative flag combinations.

## Completed

- Implemented raw argv parsing in `packages/cli/src/cli/args.ts` for supported flags, value forms, and clear parse failures.
- Implemented Zod-based argument validation/coercion in `packages/cli/src/cli/schema.ts` including provider/session override constraints.
- Implemented startup bootstrap in `packages/cli/src/cli/start.ts` to parse args, initialize SDK, open sessions, and launch app runtime.
- Refactored `startCli` to support dependency injection for deterministic startup tests without terminal side effects.
- Added CLI parsing and startup tests in:
  - `packages/cli/src/cli/args.test.ts`
  - `packages/cli/src/cli/schema.test.ts`
  - `packages/cli/src/cli/start.test.ts`

## Verified

- `bun test packages/cli/src`
- `bun run --cwd packages/cli typecheck`
- `bun run packages/cli/src/index.ts --help`
