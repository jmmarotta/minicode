---
schema: aglit.issue.md.v1
id: 019c4f3d-32a4-7000-9f02-14de83e3b666
status: planned
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Scaffold CLI package and minicode binary entrypoint

## Description

- Scaffold the `packages/cli` package and publishable `minicode` binary entrypoint.

## Acceptance

- CLI package has package metadata, scripts, TypeScript config, and source entry files.
- Binary mapping resolves `minicode` to the package entrypoint.
- Running the new binary starts and exits cleanly in baseline mode.

## Constraints

- Keep scaffold minimal and compatible with workspace tooling.
- Do not pull business logic into the entrypoint file.

## Plan

1. Create CLI package structure and `package.json` bin mapping.
2. Add `src/index.ts` and startup delegation module.
3. Wire package scripts and workspace references.
4. Validate binary execution from repo root.

## Verification

- Run the CLI entry command and confirm expected startup behavior.
- Confirm package typecheck passes with strict settings.
