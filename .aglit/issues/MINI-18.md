---
schema: aglit.issue.md.v1
id: 019c4f3d-3183-7000-aa1a-6a6fec618175
status: done
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement SDK config schemas and merge loader

## Description

- Implement SDK config schemas and loader to merge defaults, files, env, and overrides with Zod validation.

## Acceptance

- Config merge order matches documented precedence.
- Invalid config fails with clear path-based errors.
- Plugin references are sourced from global config only.

## Constraints

- Keep defaults explicit and schema-driven.
- Do not allow runtime overrides to register plugins.

## Plan

1. Implement config schemas in `config/schema.ts`.
2. Implement source readers and merge logic in `config/load.ts`.
3. Add env mapping for provider credentials/runtime knobs.
4. Validate and return fully resolved config object.

## Verification

- Add merge-order tests with conflicting values across sources.
- Confirm invalid inputs fail with actionable validation messages.

## Completed

- Implemented/validated config merge loader precedence in `packages/sdk/src/config/load.ts`:
  - defaults -> global config -> project config -> env -> overrides
  - plugin references enforced from global config only
- Added path-based validation error reporting for Zod failures in `loadSdkConfig(...)`.
- Added config merge and validation tests in `packages/sdk/src/config/load.test.ts` covering:
  - precedence conflicts across all sources
  - project/override plugin rejection behavior
  - actionable invalid-config error messages with schema paths

## Verified

- `bun test packages/sdk/src/config`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
