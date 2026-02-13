---
schema: aglit.issue.md.v1
id: 019c4f3d-2fca-7000-aeb2-cafabdd9a6e3
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Implement SDK providers, built-in tools, and global plugin loader

## Description

- Deliver SDK integration for provider selection, built-in tools, and global plugin loading in one working runtime.

## Acceptance

- OpenAI and Anthropic are validated with at least one tool call each.
- Plugin references from global config load and contribute runtime behavior.
- Built-in tools use normalized `ToolOutput` envelopes.

## Constraints

- Keep tool schemas provider-compatible (simple object inputs).
- Enforce global-only plugin registration policy.

## Plan

1. Implement provider factory and runtime selection.
2. Implement/read/write/edit/bash toolset with truncation behavior.
3. Implement plugin reference normalization and loading pipeline.
4. Compose tools/instructions/actions with conflict checks.

## Verification

- Execute cross-provider tool-calling smoke tests.
- Load both package and file URL plugins from global config and confirm contributions are active.

## Progress

- Activated issue and queued implementation order: provider factory -> built-in `ToolOutput` tools -> plugin loading pipeline.

## Completed

- Implemented SDK config schemas and loader with plugin global-only enforcement:
  - `packages/sdk/src/config/schema.ts`
  - `packages/sdk/src/config/load.ts`
- Implemented provider runtime selection and language-model factory for OpenAI, Anthropic, Google, and OpenAI-compatible:
  - `packages/sdk/src/providers/factory.ts`
- Implemented built-in tools (`read`, `write`, `edit`, `bash`) using normalized `ToolOutput` envelopes:
  - `packages/sdk/src/tools/shared.ts`
  - `packages/sdk/src/tools/output.ts`
  - `packages/sdk/src/tools/read.ts`
  - `packages/sdk/src/tools/write.ts`
  - `packages/sdk/src/tools/edit.ts`
  - `packages/sdk/src/tools/bash.ts`
  - `packages/sdk/src/tools/index.ts`
- Implemented plugin normalization, import/load validation, and contribution composition with conflict checks:
  - `packages/sdk/src/plugins/normalize.ts`
  - `packages/sdk/src/plugins/load.ts`
  - `packages/sdk/src/plugins/compose.ts`
  - `packages/sdk/src/plugins/types.ts`
- Implemented `createMinicode()` composition root and SDK export surface updates:
  - `packages/sdk/src/sdk.ts`
  - `packages/sdk/src/types.ts`
  - `packages/sdk/src/index.ts`
- Added automated SDK smoke tests covering:
  - OpenAI + Anthropic runtime creation and one tool-call turn each (mocked model streams)
  - package + file URL plugin loading from global config
  - `packages/sdk/src/sdk.test.ts`

## Verified

- `bun test packages/sdk/src/sdk.test.ts`
- `bunx oxlint --type-aware packages/sdk/src/**/*.ts`
- `bun run typecheck`
