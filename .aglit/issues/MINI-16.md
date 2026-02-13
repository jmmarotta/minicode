---
schema: aglit.issue.md.v1
id: 019c4f3d-313a-7000-abf0-dff12d4d3702
status: done
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Add core unit tests for stream mapping and ToolOutput conversion

## Description

- Add focused unit tests for stream mapping and ToolOutput conversion to lock in core behavior.

## Acceptance

- Tests cover key stream event mappings and response aggregation paths.
- Tests cover `defineTool` success/failure conversion behavior.
- Test suite passes in CI/local workflow.

## Constraints

- Prefer fast, deterministic tests with minimal mocking.
- Validate behavior, not internal implementation details.

## Plan

1. Add fixtures for representative stream part sequences.
2. Implement mapping assertions for emitted events and final response.
3. Add tests for ToolOutput model mapping and error normalization.
4. Integrate tests into package scripts/CI tasks.

## Verification

- Run core package tests and confirm all new cases pass.
- Confirm failing fixtures produce actionable assertion output.

## Completed

- Added focused stream mapping unit tests in `packages/core/src/runner/events.test.ts` covering:
  - text/reasoning delta mapping
  - tool call/result/error mapping
  - finish-step/finish/abort/error mapping
  - unsupported part passthrough (`undefined`)
- Expanded core stream and aggregation coverage already present in `packages/core/src/runner/stream.test.ts` (including abort and single-consumption behavior).
- Added and validated ToolOutput conversion/error-normalization coverage in `packages/core/src/tools/output.test.ts`.
- Ensured tests remain deterministic and behavior-focused with local fixtures and no network dependencies.

## Verified

- `bun test packages/core/src/runner packages/core/src/tools`
- `bun test`
- `bun run lint:check`
- `bun run typecheck`
