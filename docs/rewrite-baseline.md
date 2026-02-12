# Rewrite Baseline

Date: 2026-02-11

## Baseline commit and refs

- Baseline branch strategy: keep day-to-day development on `main` and perform rewrite work on `rewrite/agent-v2`.
- Baseline commit: `9933868` on `main` at capture time.
- Baseline refs created:
  - Branch: `rewrite/agent-v2` -> `9933868`
  - Tag: `legacy-pre-rewrite-2026-02-11` -> `9933868`

## Legacy startup and validation commands

Captured from the baseline state before rewrite changes.

### Startup

- Command: `bun run packages/core/src/index.ts <<< "exit"`
- Expected behavior:
  - prints `Enter a prompt (or 'exit' to quit):`
  - exits cleanly with `Goodbye`

### Validation

- Command: `bun run lint:check`
- Expected behavior:
  - runs Oxlint with existing warning set
  - exits non-zero in baseline due to the JSON-eslint glob pattern mismatch

- Command: `bun run typecheck`
- Expected behavior:
  - runs `bun turbo typecheck`
  - runs `@minicode/core` typecheck
  - reports baseline AI SDK provider type mismatch in `packages/core/src/index.ts`

## Repro steps

1. Check out baseline commit via `git checkout legacy-pre-rewrite-2026-02-11`.
2. Run `bun install`.
3. Run startup and validation commands listed above to compare behavior.
