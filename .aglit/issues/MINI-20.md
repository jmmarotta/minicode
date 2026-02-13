---
schema: aglit.issue.md.v1
id: 019c4f3d-31cb-7000-a725-b9dfcaee1418
status: planned
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
