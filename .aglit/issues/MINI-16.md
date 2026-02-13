---
schema: aglit.issue.md.v1
id: 019c4f3d-313a-7000-abf0-dff12d4d3702
status: planned
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
