---
schema: aglit.issue.md.v1
id: 019c4f3d-3237-7000-8d20-320b3e6de14a
status: planned
priority: medium
projectId: 019c4f3c-e5c3-7000-9348-2bb81e82a963
---

# Implement built-in tools using core defineTool contracts

## Description

- Implement built-in SDK tools (`read`, `write`, `edit`, `bash`) using core `defineTool` and normalized contracts.

## Acceptance

- Each built-in tool exposes a simple Zod input schema and returns `ToolOutput`.
- `edit` enforces deterministic one-match replacement semantics.
- `bash` reports exit code, truncation, and error conditions consistently.

## Constraints

- Keep input schemas compatible across providers.
- Keep behavior deterministic and easy to reason about.

## Plan

1. Implement shared helpers for serialization, truncation, and error mapping.
2. Implement each tool module with strict input/output behavior.
3. Compose tool registry via `tools/index.ts`.
4. Add coverage for common success and failure scenarios.

## Verification

- Run tool-focused tests and smoke calls through a local turn.
- Validate model-facing output uses `outputMessage` and not raw details blobs.
