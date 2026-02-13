---
schema: aglit.issue.md.v1
id: 019c4f3d-31a6-7000-a881-4a2816863791
status: planned
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement plugin schemas, normalization, loading, and composition

## Description

- Implement plugin schemas, reference normalization, module loading, and contribution composition in the SDK plugin pipeline.

## Acceptance

- Plugin references are normalized deterministically.
- Plugin module contract is validated with fail-fast errors by stage.
- Composed contributions enforce duplicate/conflict checks.

## Constraints

- Keep ordering deterministic using configured map insertion order.
- Preserve global-only plugin loading policy.

## Plan

1. Add plugin schema and type modules.
2. Implement normalizer for package/file URL references.
3. Implement module import + runtime contract validation.
4. Implement composition with duplicate id/tool/action conflict checks.

## Verification

- Test valid plugin load paths for package and file URL references.
- Test conflict and invalid-contract failures with clear diagnostics.
