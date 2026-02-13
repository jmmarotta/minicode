---
schema: aglit.issue.md.v1
id: 019c4f3d-327f-7000-88bc-742b9c659888
status: planned
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Add SDK tests for config, plugins, providers, persistence, and smoke flows

## Description

- Add SDK test coverage for config merging, plugin loading, provider resolution, persistence, artifacts, and an end-to-end smoke workflow.

## Acceptance

- Tests cover all major SDK modules and critical edge cases.
- Smoke path verifies `createMinicode` and `openSession` lifecycle behavior.
- Test suite is stable and runnable in CI/local development.

## Constraints

- Keep tests fast and deterministic with fixture-driven inputs.
- Prefer behavior-level assertions over implementation-coupled checks.

## Plan

1. Add module-level tests for config, plugins, and providers.
2. Add persistence/artifact integration tests with temporary dirs.
3. Add a smoke test covering SDK public workflow.
4. Integrate tests into package scripts and workspace tasks.

## Verification

- Run SDK test suite and confirm all new cases pass.
- Confirm failures produce clear diagnostics for fast debugging.
