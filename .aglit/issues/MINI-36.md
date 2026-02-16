---
schema: aglit.issue.md.v1
id: 019c4f3d-340f-7000-b695-6495036ce51b
status: done
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Add plugin types and schemas in SDK

## Description

- Add foundational plugin types and Zod schemas in SDK to formalize plugin contracts.

## Acceptance

- Plugin, contribution, action, and setup context types are defined.
- Zod schemas validate plugin reference and contribution envelope boundaries.
- Types/schemas are used by loader/composer modules.

## Constraints

- Keep contract minimal and versioned (`apiVersion`).
- Separate serializable schema checks from runtime function checks.

## Plan

1. Define plugin contract types in `plugins/types.ts`.
2. Define schema module for config/references/contribution structure.
3. Align schema/type names with plan docs.
4. Export internal helpers for downstream plugin pipeline modules.

## Verification

- Typecheck plugin modules against new contract types.
- Validate sample plugin payloads through schemas.

## Completed

- Added foundational plugin contract types in `packages/sdk/src/plugins/types.ts` (`MinicodePlugin`, contribution/setup context, loaded plugin metadata).
- Added plugin schema boundaries in `packages/sdk/src/plugins/schema.ts` for plugin objects and contribution envelopes.
- Integrated schema/type usage in loader and composition modules.

## Verified

- `bun test packages/sdk/src/plugins`
- `bun run typecheck`
