# Minicode Rewrite Plan (core + sdk + cli, Bun-only)

Date: 2026-02-04
Status: Draft plan for a from-scratch overhaul

This rewrite is inspired by Mario Zechner's "pi" post:
https://mariozechner.at/posts/2025-11-30-pi-coding-agent/

The goal is a minimal, observable coding-agent harness:

- Minimal system prompt
- Minimal toolset
- Scrollback-first terminal UX (stdout is the scrollback; only the input box is UI)
- Clean session format that is easy to post-process
- Multi-provider support (OpenAI, Anthropic, Google, OpenAI-compatible)
- Bun-only runtime
- Zod everywhere for runtime schemas

---

## Goals (v0)

- Bun-only monorepo with three packages: core, sdk, cli.
- Use the latest AI SDK major (AI SDK 6) for streaming + ToolLoopAgent.
- Support providers:
  - OpenAI (@ai-sdk/openai)
  - Anthropic (@ai-sdk/anthropic)
  - Google Generative AI (@ai-sdk/google)
  - OpenAI-compatible (@ai-sdk/openai-compatible)
- Minimal toolset: read, write, edit, bash.
- Use OpenTUI only for a bottom input editor:
  - TextareaRenderable for multiline user input
  - renderer.experimental_splitHeight = <rows> to reserve footer space
  - any stdout writes (agent/tool output) go to terminal scrollback above the footer
- CLI package is the user entrypoint and starts the TUI by default.
- Command palette supports session actions, model switching, and new-session
  runtime selection.
- Global code-based plugins are loaded from Bun-resolved references.
- Sessions persisted to disk with a documented, stable JSON format.
- Repo tooling:
  - Turborepo (turbo)
  - Lefthook (lefthook.yml)
  - Oxlint type-aware (keep oxlint-tsgolint)
  - Oxfmt (.oxfmtrc.json)
  - tsgo typecheck (via @typescript/native-preview)
  - no tsc in scripts/CI

---

## Non-goals (v0)

(Aligned with the pi philosophy; we can add later if truly needed.)

- Full-screen TUI or custom scrollback/search (terminal scrollback is the UI).
- Built-in todo system.
- Built-in plan mode (planning can be done by writing a markdown file if desired).
- MCP support.
- Plugin marketplace/discovery/install flows.
- Project-local plugins.
- Background process management inside the agent (no background bash).
- Sub-agent orchestration (can be done by spawning new CLI instances later if needed).
- Perfect cross-provider context handoff with provider-specific blobs (best-effort only).
- Web fetch/search tool (model can use curl via bash if necessary).
- Permission prompting/approval flows (v0 runs tools directly with no checks).

---

## Key Decisions

- Runtime: Bun only (no Node compatibility goal).
- Validation: Zod for all runtime schemas (config, sessions, tools).
- Agent loop: ToolLoopAgent from AI SDK.
- Conversation unit: Session + TurnRequest/TurnResponse.
- Tool outputs: ToolOutput with outputMessage for model-facing results.
- Tool schemas: avoid Gemini-incompatible Zod features (z.union, z.record).
- Tool strict mode: default to strict: false for maximum provider compatibility,
  especially OpenAI-compatible/self-hosted endpoints.
- Runtime permissions: allow-all in v0 (no runtime confirmation prompts).
- Plugin policy: global-only plugin loading from config references
  (`@scope/plugin`, `file:///...`).
- Plugin config shape: `plugins` object map (`reference -> config object`).
- Plugin order follows configured object entry order.

---

## Repository Structure (Target)

```
packages/
  core/
    package.json
    tsconfig.json
    src/
      index.ts
      agent/
        agent.ts
        turn.ts
        stream.ts
        events.ts
        instructions.ts
      session/
        session.ts
        state.ts
        repository.ts
      tools/
        output.ts
        define.ts
        types.ts
      util/
        errors.ts
  sdk/
    package.json
    tsconfig.json
    src/
      index.ts
      types.ts
      sdk.ts
      config/
        schema.ts          # zod config schema (merged global+project+env+cli)
        load.ts
      providers/
        types.ts
        factory.ts         # openai/anthropic/google/openai-compatible
      plugins/
        types.ts           # plugin module and contribution types
        schema.ts          # zod schemas for plugin references and config map
        normalize.ts       # normalize package refs and file URLs
        load.ts            # import/validate plugin modules
        compose.ts         # merge plugin contributions + conflict checks
      tools/
        shared.ts
        read.ts
        write.ts
        edit.ts
        bash.ts
        index.ts
      session/
        fs-repository.ts   # file-backed SessionRepository using Bun APIs
        paths.ts
      artifacts/
        fs-store.ts        # file-backed ArtifactStore using Bun APIs
      util/
        errors.ts
  cli/
    package.json
    tsconfig.json
    src/
      index.ts             # CLI entrypoint
      cli/
        args.ts            # parse args (Bun)
        schema.ts          # zod CLI arg schemas
        start.ts           # bootstrap SDK + app
      app/
        app.ts             # app coordinator (session, turn, queue)
        commands.ts        # slash command router and handlers
        queue.ts           # in-flight turn + FIFO queue
      ui/
        footer.ts          # OpenTUI split-mode footer with TextareaRenderable
        palette.ts         # command palette in footer region
        stdout.ts          # stdout wrapper that triggers footer redraw
        event-renderer.ts  # TurnEvent -> stdout lines
      util/
        errors.ts
plans/
  initial.md
  core.md
  sdk.md
  tui.md
  plugins.md
  future_improvements.md
```

Package naming (recommended):

- packages/core name: @minicode/core
- packages/sdk name: @minicode/sdk
- packages/cli name: minicode (the CLI)

---

## Core Package Details

See plans/core.md for the detailed core package design, file list, and
responsibilities.
The package-specific plan is authoritative for core interfaces and schemas.

---

## UX Specification (CLI + TUI)

See plans/tui.md for the detailed CLI and TUI package plan.

### Terminal behavior

- Do not use the alternate screen buffer.
- Agent output is written to stdout (scrollback).
- The input box stays fixed at the bottom via OpenTUI split mode.

### Footer layout

- Footer height default: 8-12 rows (configurable).
- Bottom footer contains:
  - a bordered container
  - TextareaRenderable filling most of the footer

### Keybindings

- Submit: Ctrl+Enter
- Newline in textarea: Enter
- Open command palette: Ctrl+K
- Abort current generation: Ctrl+C (when streaming)
- Exit: Esc (or Ctrl+C when idle)
- Never call process.exit(); exit via renderer.destroy().

### Command palette (v0)

- Palette opens in the footer region, not as a fullscreen UI.
- Actions include: new session, switch session, switch model, help, exit.
- Model switch updates the active session runtime within the same provider.
- Provider changes happen only when creating a new session.

### Concurrency + input while streaming

- Allow typing while the agent streams output.
- Control commands execute immediately while streaming (`/abort`, `/exit`, `Ctrl+C`).
- `/abort`: cancel active turn immediately; no-op when idle.
- `/exit`: if streaming, abort then exit after turn settles; if idle, exit immediately.
- If user submits while streaming:
  - default behavior: queue the message (print a short "[queued]" line to stdout)
  - optional later: provide a setting to abort-and-send instead
- If user aborts while streaming (Ctrl+C):
  - keep partial assistant text already produced in transcript
  - append a `user` interruption marker message: `[interrupted by user]`

### Output formatting (v0)

- Keep output readable and grep-able in scrollback:
  - print tool start/end markers
  - print exit codes
  - truncate very large outputs but save full outputs as artifacts

---

## Configuration (Zod)

### Sources of configuration (merge order)

1. Defaults
2. Global config file (recommended): ~/.config/minicode/config.json
3. Project config file (optional): <project>/.minicode/config.json
4. Environment variables
5. CLI args

All parsing/merging validated with Zod.

Plugin references are loaded from global config only. Project config may override
runtime/tool values but cannot register plugins.

### Required provider env vars (defaults)

- OpenAI: OPENAI_API_KEY
- Anthropic: ANTHROPIC_API_KEY
- Google: GOOGLE_GENERATIVE_AI_API_KEY
- OpenAI-compatible (recommended):
  - OPENAI_COMPATIBLE_API_KEY
  - OPENAI_COMPATIBLE_BASE_URL

### Config shape (example)

```json
{
  "provider": "openai",
  "model": "gpt-4.1",
  "openaiCompatible": {
    "name": "my-llm",
    "baseURL": "http://localhost:11434/v1"
  },
  "ui": {
    "footerHeight": 10
  },
  "agent": {
    "maxSteps": 20
  },
  "tools": {
    "strict": false,
    "bash": {
      "defaultTimeoutMs": 60000,
      "maxOutputBytes": 30000
    }
  },
  "plugins": {
    "@scope/plugin": {
      "enabled": true
    },
    "file:///Users/foo/plugin_dir": {}
  }
}
```

Notes:

- Do not store secrets in committed project files.
- Global config may store non-secret preferences only; keys remain in env.

---

## Provider Support (AI SDK 6)

### Implementation notes

- sdk/providers/factory.ts builds a LanguageModel from { provider, model, ... }.
- Keep provider-specific options minimal at first.
- Prefer stable APIs; if repo pins beta versions, pin consistently via Bun
  workspace catalog.

### OpenAI-compatible risk and mitigation

The pi article notes tool-calling quirks across OpenAI-compatible endpoints.
Mitigation strategy:

- Default tools to strict: false.
- Keep tool input schemas simple:
  - objects with required string/number fields
  - avoid unions/records
  - avoid deep nesting
- Provide a config toggle per provider to enable strict when known-good.

---

## SDK Package Details

See plans/sdk.md for the detailed SDK design, public API, file list,
SessionRepository/ArtifactStore boundaries, and implementation phases.
See plans/plugins.md for the plugin module contract and loading policy.
The package-specific plans are authoritative for SDK/plugin contracts.

---

## Sessions (Zod)

### Format

Persist a session JSON file with:

- version: 1
- id: string
- cwd: string
- createdAt: number (ms)
- updatedAt: number (ms)
- provider: ProviderId string (`openai` | `anthropic` | `google` | `openai-compatible`)
- model: string
- messages: ModelMessage[] (AI SDK type; JSON serializable)
- optional: metadata (object), usageTotals, artifacts[]

Validate on load with Zod; tolerate forward-compatible fields.

### Locations

Recommended:

- Global config: ~/.config/minicode/
- Sessions: ~/.local/share/minicode/sessions/<id>/session.json
- Artifacts: ~/.local/share/minicode/sessions/<id>/artifacts/\*

Provide CLI flags to override the base dir.

---

## CLI + TUI (packages/cli) + OpenTUI Split Footer

### OpenTUI configuration

- Use OpenTUI core (imperative).
- useAlternateScreen: false
- useConsole: false
- renderer.experimental_splitHeight = footerHeight

### Stdout integration

To keep the footer stable while writing to stdout:

- Wrap stdout writes used by the app (agent stream + tool logs) with a helper that:
  - writes to process.stdout
  - schedules renderer.requestRender() (debounced) so footer redraws
    after scrollback output

Do not implement custom scrollback; rely on terminal scrollback.

---

## Repo Tooling (Turbo + Lefthook + Oxc + tsgo)

### Formatter (Oxfmt)

- Commit .oxfmtrc.json with:
  - semi: false
  - printWidth: 120
  - ignore patterns (node_modules, dist, etc.)

Scripts:

- fmt: oxfmt
- fmt:check: oxfmt --check

### Lint (Oxlint, type-aware)

- Commit .oxlintrc.json (keep it small; enable correctness + typescript plugin).
- Keep oxlint-tsgolint installed.

Scripts:

- lint: oxlint --type-aware --fix --fix-suggestions
- lint:check: oxlint --type-aware

### Typecheck (tsgo, no tsc)

- Install @typescript/native-preview and use:
  - tsgo --noEmit -p <package>/tsconfig.json

### Git hooks (Lefthook)

Commit lefthook.yml:

- pre-commit: run fmt + lint:check
- pre-push: run typecheck + test

Recommended: add postinstall script to run lefthook install.

### Turbo

turbo.json tasks:

- fmt, fmt:check, lint, lint:check: run at root (or per package if preferred)
- typecheck, test: per package
- dev: packages/cli only

---

## Execution Plan (How we rewrite safely)

We will do the rewrite in checkpoints so the repo stays runnable.

### Step 0: Preserve old state

- Create branch: rewrite/agent-v2
- Optional tag: legacy-pre-rewrite

### Step 1: Scaffold new packages first (do not delete yet)

- Add packages/sdk and packages/cli with minimal entrypoints.
- Incrementally rewrite packages/core in place to the new core boundaries.
- Ensure bun run packages/cli/src/index.ts runs and exits cleanly.

Acceptance:

- Running the new CLI prints a banner and exits (no OpenTUI yet).

### Step 2: Tooling baseline

- Replace Prettier + ESLint JSON lint with Oxfmt + Oxlint.
- Add Lefthook.
- Add tsgo scripts.
- Turbo tasks wired.

Acceptance:

- bun run fmt:check
- bun run lint:check
- bun run typecheck

### Step 3: OpenTUI footer prototype

- Implement split footer with TextareaRenderable.
- Submit via Ctrl+Enter prints the textarea contents to stdout.
- Ensure scrollback output does not break footer.

Acceptance:

- Footer remains stable while repeated stdout writes occur.

### Step 4: Core runner + events

- Implement packages/core agent wrapper that:
  - streams events from AI SDK
  - produces final responseMessages and usage
  - uses TurnRequest/TurnResponse naming

Acceptance:

- A trivial model call streams deltas and emits step-finish events.

### Step 5: SDK providers + tools + plugins

- Provider factory for OpenAI/Anthropic/Google/OpenAI-compatible.
- Implement read/write/edit/bash with ToolOutput and truncation rules.
- Implement global plugin loader (`plugins` map with package and file references).

Acceptance:

- Tool calling works on OpenAI + Anthropic with at least one tool invocation each.
- Plugin references resolve from global config for npm package and file URL.

### Step 6: Sessions

- File-backed session repository.
- New session + resume session.

Acceptance:

- Restart CLI and resume the same conversation.

### Step 7: Wire CLI + TUI to SDK

- CLI starts TUI by default and submits prompts through Session.send().
- Agent streams -> stdout scrollback, footer remains fixed.
- Abort and queue.
- Add command palette actions for session switching and model switching.
- Add provider selection for new session creation flows.
- Add plugin-contributed commands/actions to slash commands and command palette.

Acceptance:

- Full interactive loop works end-to-end.
- Built-in and plugin actions execute through the same command routing path.

### Step 8: Delete legacy code

- Remove remaining legacy directories/files that are outside the new
  core/sdk/cli layout.
- Rewrite README.md for the new architecture.

Acceptance:

- Repo contains only the new implementation + tooling.

---

## Milestones Summary (Definition of Done)

- M0: minicode launches, footer textarea works, scrollback output is stable.
- M1: Streaming model output works (no tools) on at least one provider.
- M2: Tools work with streaming agent loop on OpenAI + Anthropic.
- M3: Google + OpenAI-compatible verified.
- M4: Sessions persisted and resumable.
- M5: Command palette works for session/model switching and new-session provider selection.
- M6: Global plugins load from package/file references with plugin config.

---

## Known Risks and Mitigations

- OpenTUI is experimental:
  - isolate usage to packages/cli/src/ui/footer.ts and packages/cli/src/ui/palette.ts
  - keep the rest of the app pure stdout
- Gemini schema limitations:
  - no z.union / z.record in tool inputs
  - keep tool inputs simple
- OpenAI-compatible endpoints may be picky about tool calling:
  - default strict: false
  - provide a config knob for strict mode per provider
- Plugin conflicts (duplicate tool/command ids):
  - fail fast with explicit conflict errors
- Output collisions while rendering footer:
  - wrap stdout writes and request footer redraw (debounced)

---

## Next Steps (After v0)

- Context files (pi-style):
  - load AGENTS.md or similar hierarchical context (global + project)
- More read-only tools (ls, find, grep) as optional restrictions
- Better artifact management (store full tool outputs, diffs, etc.)
- Optional: branch sessions / export sessions to HTML/Markdown
