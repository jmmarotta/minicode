---
schema: aglit.issue.md.v1
id: 019c4f3d-31cb-7000-a725-b9dfcaee1418
status: done
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement provider factory for OpenAI, Anthropic, Google, and OpenAI-compatible

## Description

- Implement the provider factory for OpenAI, Anthropic, Google, and OpenAI-compatible runtime creation.

## Acceptance

- Factory returns a language model for each supported provider family.
- Missing credential/baseURL cases throw actionable errors.
- Provider-specific configuration stays internal to SDK modules.

## Constraints

- Keep public API provider-agnostic where possible.
- Ensure defaults are compatible with tool-calling behavior.

## Plan

1. Define normalized provider config inputs.
2. Implement provider-specific model constructors.
3. Add validation/error mapping for missing required settings.
4. Expose one internal `createLanguageModel` entrypoint.

## Verification

- Smoke test factory resolution for each provider with minimal valid config.
- Confirm invalid provider config paths fail early with clear messages.

## Completed

- Implemented and tightened provider factory validation in `packages/sdk/src/providers/factory.ts` for:
  - OpenAI
  - Anthropic
  - Google
  - OpenAI-compatible
- Added actionable error handling for missing credentials and missing OpenAI-compatible `baseURL`.
- Preserved provider-specific runtime construction internally behind `createLanguageModel(...)` and `resolveRuntime(...)`.
- Added focused provider factory tests in `packages/sdk/src/providers/factory.test.ts` covering:
  - all supported provider families
  - missing credential failures
  - missing OpenAI-compatible base URL
  - provider override model resolution behavior

## Verified

- `bun test packages/sdk/src/providers`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
