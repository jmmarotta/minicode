# Tool Refactoring Guide

This document outlines the process for converting tools to the simplified module pattern.

## Overview

We are refactoring tools to follow a consistent, simplified pattern that:
- Uses direct module exports instead of namespaces
- Removes unnecessary complexity (permissions, lazy loading, TreeSitter)
- Adds logging capabilities for debugging
- Uses synchronous tool definitions with direct imports

## Step-by-Step Process

### 1. Update Imports

**Remove:**
- `Permission` imports
- `Agent` imports
- `Wildcard` imports
- `lazy` from util/lazy
- TreeSitter-related imports
- Any unused imports

**Add:**
- `import { Logger } from "../util/logger"`
- Direct description import: `import DESCRIPTION from "./description/<tool-name>.txt"`

**Example:**
```typescript
// Before
import { lazy } from "../util/lazy"
import { Permission } from "../permission/permission"

// After
import { Logger } from "../util/logger"
import DESCRIPTION from "./description/bash.txt"
```

### 2. Add Logger Instance

Create a logger instance at the module level:

```typescript
const log = Logger.create({ service: "<tool-name>-tool" })
```

### 3. Convert Tool Definition

**Remove async wrapper if using direct imports:**

```typescript
// Before
const tool = Tool.define("tool-name", async () => {
  const description = await Bun.file(path.join(import.meta.dir, "description", "tool.txt")).text()
  return {
    description,
    parameters: z.object({...}),
    async execute(params, ctx) {...}
  }
})

// After
const tool = Tool.define("tool-name", {
  description: DESCRIPTION,
  parameters: z.object({...}),
  async execute(params, ctx) {...}
})
```

### 4. Remove Permission Checking

Delete any permission-related code from the execute function:

```typescript
// Remove this entire section
const permission = Permission.for(ctx.agent, "bash", params.command)
if (permission === "deny") {
  throw new Error("Permission denied")
}
```

### 5. Remove TreeSitter/Parser Logic

If the tool has TreeSitter AST parsing (like bash.ts did), remove:
- Parser cache (`parserCache`, `getParser()` functions)
- Path validation loops
- Related imports (`Bun.$`, `Filesystem`, etc.)

### 6. Convert Export Pattern

Change from namespace export to module object export:

```typescript
// Before
export const BashTool = Tool.define(...)

// After
const tool = Tool.define(...)

export const Bash = {
  tool,
}
```

### 7. Update Registry

In `packages/core/src/tool/registry.ts`:

```typescript
// Add import
import { Bash } from "./bash"

// Add to ALL array
const ALL = [Read.tool, Bash.tool, List.tool]
```

## Consistent Patterns

### Tool Definition Structure

All tools should follow this structure:

```typescript
import { z } from "zod"
import { Tool } from "./tool"
import { Logger } from "../util/logger"
import DESCRIPTION from "./description/<tool-name>.txt"
// ... other necessary imports

const log = Logger.create({ service: "<tool-name>-tool" })

const tool = Tool.define("<tool-id>", {
  description: DESCRIPTION,
  parameters: z.object({
    // parameter definitions
  }),
  async execute(params, ctx) {
    // implementation
    return {
      title: "...",
      metadata: { ... },
      output: "..."
    }
  },
})

export const ToolName = {
  tool,
}
```

### When to Use Async Tool.define

Only use `async () => ({...})` wrapper if you need to:
- Load resources asynchronously at initialization
- Perform expensive setup that should be deferred

If using direct imports (`import DESCRIPTION from ...`), use the sync pattern.

### Naming Conventions

- Tool definition variable: `tool` (lowercase)
- Export name: PascalCase based on tool purpose (e.g., `Bash`, `Read`, `List`)
- Logger service name: `"<tool-name>-tool"` (e.g., `"bash-tool"`, `"read-tool"`)

## What We've Removed

1. **Permission System**: All permission checking logic
2. **Lazy Loading**: The `lazy()` wrapper pattern
3. **TreeSitter Parser**: AST parsing and validation (from bash.ts)
4. **Namespace Exports**: Direct tool exports replaced with module objects
5. **Async Wrappers**: When not needed (i.e., when using direct imports)

## What We've Added

1. **Logger**: Consistent logging capability across all tools
2. **Module Pattern**: Cleaner export structure with `{ tool }` objects
3. **Direct Imports**: For descriptions when possible

## Example: Complete Before/After

### Before (bash.ts - simplified)
```typescript
import { lazy } from "../util/lazy"
import { Permission } from "../permission/permission"

const tool = Tool.define("bash", async () => {
  const description = await Bun.file(...).text()
  const parser = await getParser()

  return {
    description,
    parameters: z.object({...}),
    async execute(params, ctx) {
      const permission = Permission.for(ctx.agent, "bash", params.command)
      if (permission === "deny") throw new Error("denied")

      // AST parsing validation
      const paths = extractPaths(parser, params.command)

      // actual execution
    }
  }
})

export const BashTool = lazy(() => tool)
```

### After (bash.ts - simplified)
```typescript
import { Logger } from "../util/logger"
import DESCRIPTION from "./description/bash.txt"

const log = Logger.create({ service: "bash-tool" })

const tool = Tool.define("bash", {
  description: DESCRIPTION,
  parameters: z.object({...}),
  async execute(params, ctx) {
    // actual execution only
  }
})

export const Bash = {
  tool,
}
```

## Tools Converted

- ✅ `read.ts` → `Read`
- ✅ `bash.ts` → `Bash`
- ✅ `ls.ts` → `List`

## Future Tool Development

When creating new tools, follow the "After" pattern from the start:
1. Use direct imports for descriptions
2. Include Logger from the beginning
3. Use sync Tool.define with object pattern
4. Export as module object: `export const ToolName = { tool }`
5. No permissions, no lazy loading, no unnecessary async wrappers
