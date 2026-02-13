---
schema: aglit.issue.md.v1
id: 019c4f3d-3084-7000-9b24-547ac0ec722d
status: done
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

## Completed

- Added core tool output contract and wrapper utilities in `packages/core/src/tools/output.ts`:
  - `ToolOutputSchema` / `ToolOutput`
  - `defineTool(...)`
  - `executeWithToolOutput(...)` with normalized error handling
  - `toModelTextOutput(...)` mapping to model-safe text (`outputMessage` only)
  - `success(...)` / `failure(...)` helpers
- Added core tool exports in `packages/core/src/tools/index.ts` and public exports in `packages/core/src/index.ts`.
- Wired SDK built-in tools to use the core tool-output contract and mapping path via `packages/sdk/src/tools/output.ts`.
- Added unit coverage in `packages/core/src/tools/output.test.ts` for success/failure execution paths and model output filtering.

## Verified

- `bun run lint:check`
- `bun test`
- `bun run typecheck`
