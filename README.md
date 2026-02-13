# minicode

Minicode is a Bun-first coding agent workspace split into three packages:

- `@minicode/core`: streaming agent runner primitives
- `@minicode/sdk`: runtime composition (providers, plugins, sessions, built-in tools)
- `minicode` (CLI): interactive terminal app built on top of the SDK

## Quickstart

```bash
bun install
bun run packages/cli/src/index.ts
```

## Workspace Commands

```bash
bun run lint
bun run lint:check
bun run fmt
bun run fmt:check
bun run typecheck
bun test
```

## Architecture

- `packages/core/src/runner/`
  - typed `Agent` + `Turn` model over AI SDK `ToolLoopAgent`
  - stream-to-event mapping and async queue primitives
- `packages/sdk/src/`
  - config loading/validation
  - provider runtime selection
  - plugin composition
  - file-backed sessions
  - default toolset (`read`, `write`, `edit`, `bash`)
- `packages/cli/src/`
  - args/schema/startup
  - app coordinator with turn queue
  - OpenTUI footer + command palette + stdout rendering

## Notes

- Bun is the runtime and package manager (`bun install`, `bun run`, `bun test`).
- Linting and formatting are Ox-based (`oxlint`, `oxfmt`).
