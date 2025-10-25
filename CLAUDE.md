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

# Run the application (interactive CLI)
bun run packages/core/src/index.ts
# or from core package
cd packages/core && bun run src/index.ts

# Lint code (TypeScript, JSON, Markdown)
bun lint          # lint specific files
bun lint:all      # lint all files

# Format code with Prettier
bun fmt           # format specific files  
bun fmt:all       # format all files

# Type checking
bun tsc --noEmit

# Run tests (when available)
bun test

# Run with hot reload during development
bun --hot packages/core/src/index.ts
```

## Architecture

The project follows a modular architecture with clean separation of concerns:

### Core Modules

- `packages/core/src/agent/` - Agent system with configurable models, permissions, and tools
- `packages/core/src/auth/` - Authentication management for API providers
- `packages/core/src/provider/` - AI provider integrations (Anthropic, OpenAI, etc.) with custom loaders
- `packages/core/src/session/` - Session and system prompt management
- `packages/core/src/storage/` - Data persistence layer
- `packages/core/src/tool/` - Tool registry and implementations (ReadTool, BashTool, etc.)
- `packages/core/src/config/` - Global and project configuration management
- `packages/core/src/project/` - Project instance and state management

### Supporting Modules

- `packages/core/src/bus/` - Event bus for inter-module communication
- `packages/core/src/permission/` - Permission system for tool access control
- `packages/core/src/file/` - File watching and time tracking utilities
- `packages/core/src/global/` - Global path and environment utilities
- `packages/core/src/id/` - ID generation utilities
- `packages/core/src/util/` - Shared utilities (logger, error handling, lazy loading, etc.)

### Key Architectural Patterns

1. **Namespace Pattern**: Modules use TypeScript namespaces for organization (e.g., `Config`, `Provider`, `Agent`)
2. **State Management**: Uses `Instance.state()` for lazy-loaded, cached state management
3. **Tool Registry**: Centralized tool registration with provider-specific adaptations
4. **Permission System**: Granular permissions for tools (allow/ask/deny)
5. **Lazy Loading**: Uses `lazy()` utility for deferred initialization

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

- TypeScript with strict mode enabled (extends @tsconfig/bun)
- ESLint configured for TypeScript, JSON, and Markdown files
  - Unused variables: prefix with underscore (_) to ignore warnings
  - Empty catch blocks are allowed
  - TypeScript any warnings (not errors)
- Prettier configuration:
  - No semicolons
  - Print width: 120 characters
- Follow existing patterns in neighboring files
- Use Zod for runtime validation and type inference
- Error handling: Use `NamedError` for custom errors
- Logging: Use `Logger.create({ service: "name" })`

## Common Development Patterns

- **State Management**: Use `Instance.state()` for module-level state
- **Configuration**: Access via `Config.get()` which merges global and project configs  
- **Provider Integration**: Register custom loaders in `CUSTOM_LOADERS`
- **Tool Implementation**: Extend tool registry in `packages/core/src/tool/registry.ts`
- **Async Initialization**: Use lazy loading pattern for expensive operations

For more Bun API documentation, see `node_modules/bun-types/docs/**.md`.