# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

description: Minicode - AI agent CLI tool built with Bun and TypeScript
globs: "_.ts, _.tsx, _.html, _.css, _.js, _.jsx, package.json"
alwaysApply: false

---

## Project Overview

Minicode is a TypeScript-based Bun monorepo with three packages:

- `packages/core` - runner primitives around AI SDK `ToolLoopAgent`
- `packages/sdk` - composition layer for providers, plugins, sessions, and default tools
- `packages/cli` - interactive terminal app entrypoint

## Development Commands

```bash
# Install dependencies
bun install

# Run the application (interactive CLI)
bun run packages/cli/src/index.ts

# Run with hot reload
bun --hot packages/cli/src/index.ts

# Lint code (TypeScript, JSON, Markdown)
bun run lint
bun run lint:check

# Format code with Oxfmt
bun run fmt
bun run fmt:check

# Type checking
bun run typecheck

# Run tests
bun test
```

## Architecture

The project follows a modular architecture with clean separation of concerns:

### Core Modules

- `packages/core/src/runner/agent.ts` - `createAgent` wrapper over `ToolLoopAgent`
- `packages/core/src/runner/stream.ts` - stream consumption and `Turn` response aggregation
- `packages/core/src/runner/events.ts` - AI SDK stream-part to `TurnEvent` mapping
- `packages/core/src/runner/queue.ts` - async queue utility used for turn events
- `packages/core/src/runner/types.ts` - public runner request/response/event contracts

### SDK Modules

- `packages/sdk/src/config/` - config schema + load/merge logic
- `packages/sdk/src/providers/` - provider runtime resolution + language model factory
- `packages/sdk/src/plugins/` - plugin normalization, loading, and composition
- `packages/sdk/src/session/` - file-backed session repository and schema
- `packages/sdk/src/tools/` - built-in toolset (`read`, `write`, `edit`, `bash`)
- `packages/sdk/src/sdk.ts` - `createMinicode` composition root

### CLI Modules

- `packages/cli/src/cli/` - args parsing/schema/startup bootstrap
- `packages/cli/src/app/` - app coordinator, queue, and command routing
- `packages/cli/src/ui/` - footer, palette, event renderer, stdout bridge

### Key Architectural Patterns

1. **Deep modules**: keep the runner interface small (`createAgent`, `Turn`, `TurnEvent`) and hide stream complexity.
2. **Composition at SDK layer**: providers, plugins, sessions, and tools are wired in `createMinicode`.
3. **Scrollback-first CLI UX**: footer handles input while conversation/tool output flows through stdout.

## Key Dependencies

- **ai** (v6.0.0-beta.99) - AI/ML functionality
- **zod** (v4.1.1) - Schema validation and type safety
- **TypeScript** (v5.9.2) - Strict configuration extends @tsconfig/bun

## Bun-Specific Guidelines

Default to using Bun instead of Node.js:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv

### Bun APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`
- `Bun.redis` for Redis. Don't use `ioredis`
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`
- `WebSocket` is built-in. Don't use `ws`
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa
- Use Bun.$ for shell commands with template literals

### Frontend (if needed)

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server example:

```ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }))
      },
    },
  },
  websocket: {
    open: (ws) => ws.send("Hello, world!"),
    message: (ws, message) => ws.send(message),
    close: (ws) => {
      /* handle close */
    },
  },
  development: {
    hmr: true,
    console: true,
  },
})
```

For development with hot reload:

```bash
bun --hot ./index.ts
```

## Code Standards

- TypeScript with strict mode enabled (extends @tsconfig/bun)
- Oxlint configured for TypeScript, JSON, and Markdown files
  - Unused variables: prefix with underscore (\_) to ignore warnings
  - Empty catch blocks are allowed
  - TypeScript any warnings (not errors)
- Oxfmt configuration:
  - No semicolons
  - Print width: 120 characters
- Follow existing patterns in neighboring files
- Use Zod for runtime validation and type inference

## Common Development Patterns

- **Runner integration**: depend on `createAgent` + `TurnEvent` from `packages/core/src/runner`
- **SDK composition**: wire providers/plugins/tools through `packages/sdk/src/sdk.ts`
- **CLI flow**: route prompt/slash/palette interactions through `packages/cli/src/app/commands.ts`
- **Schema boundaries**: use Zod schemas at config/session/plugin/tool boundaries

For more Bun API documentation, see `node_modules/bun-types/docs/**.md`.
