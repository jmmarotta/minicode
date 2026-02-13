---
schema: aglit.issue.md.v1
id: 019c4f3d-3183-7000-aa1a-6a6fec618175
status: planned
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
