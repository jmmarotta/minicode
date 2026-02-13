---
schema: aglit.issue.md.v1
id: 019c4f3d-3084-7000-9b24-547ac0ec722d
status: planned
priority: medium
projectId: 019c4f3c-e5a1-7000-b771-ab987f1de799
---

# Implement defineTool and ToolOutput model mapping

## Description

- Implement `defineTool` and ToolOutput-to-model mapping so tools return a unified envelope and expose only model-safe text.

## Acceptance

- `defineTool` enforces `ToolOutput` shape with `ok`, `outputMessage`, and optional details/meta.
- Model-facing output uses `outputMessage` only.
- Tool execute errors are normalized into `ok: false` output.

## Constraints

- Preserve UI access to details/meta without polluting model context.
- Keep helper ergonomic for SDK built-in and plugin tools.

## Plan

1. Define `ToolOutput` type/schema in core tools module.
2. Implement model mapping helper for success/error text variants.
3. Implement wrapper that catches execute failures and normalizes output.
4. Add examples/usages in built-in tool wiring.

## Verification

- Unit test success and failure tool paths.
- Confirm model output excludes details/meta fields.
