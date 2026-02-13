---
schema: aglit.issue.md.v1
id: 019c4f3d-3459-7000-9cc7-feba730e27eb
status: planned
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Implement plugin module loader and contract validation

## Description

- Implement plugin module loading and runtime contract validation for factory export and plugin object shape.

## Acceptance

- Loader imports plugin references and resolves default factory function.
- Factory output validates required plugin fields (`id`, `apiVersion`).
- Error reporting includes reference and failing stage context.

## Constraints

- Fail fast on invalid contracts.
- Keep plugin runtime trusted but isolated from app crashes on load failure.

## Plan

1. Implement module import and default export verification.
2. Execute plugin factory with per-reference config object.
3. Validate plugin object shape and optional setup contribution.
4. Normalize stage-aware error messages (`import`, `factory`, `validate`).

## Verification

- Test loading of valid plugin modules.
- Test invalid export/factory/plugin-shape cases and confirm diagnostics.
