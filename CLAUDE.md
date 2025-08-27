# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---
description: Minicode - AI agent CLI tool built with Bun and TypeScript
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project Overview

Minicode is a TypeScript-based CLI tool/agent system using Bun as runtime and package manager. This is a monorepo using Bun workspaces with the main package at `packages/core/`.

## Development Commands

```bash
# Install dependencies
bun install

# Run the application
bun run packages/core/src/index.ts

# Lint code (TypeScript, JSON, Markdown)
bun lint
# or
bun lint:all

# Format code with Prettier
bun fmt
# or
bun fmt:all

# Run with hot reload during development
bun --hot packages/core/src/index.ts
```

## Architecture

The project follows a modular architecture with clean separation of concerns:

- `packages/core/src/agent/` - Agent-related functionality
- `packages/core/src/auth/` - Authentication logic
- `packages/core/src/cli/` - Command line interface implementation
- `packages/core/src/provider/` - Service provider integrations
- `packages/core/src/session/` - Session management
- `packages/core/src/storage/` - Data persistence layer
- `packages/core/src/tool/` - Tool integrations
- `packages/core/src/util/` - Shared utilities

## Key Dependencies

- **ai** (v5.0.23) - AI/ML functionality
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
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  websocket: {
    open: (ws) => ws.send("Hello, world!"),
    message: (ws, message) => ws.send(message),
    close: (ws) => { /* handle close */ }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

For development with hot reload:
```bash
bun --hot ./index.ts
```

## Code Standards

- TypeScript with strict mode enabled
- ESLint configured for TypeScript, JSON, and Markdown
- Prettier for consistent formatting
- Follow existing patterns in neighboring files
- Use Zod for runtime validation when handling external data

For more Bun API documentation, see `node_modules/bun-types/docs/**.md`.