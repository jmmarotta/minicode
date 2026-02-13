# CLI + TUI Package Plan (packages/cli)

Date: 2026-02-06
Status: Draft plan for packages/cli

This document defines the user-facing application package. It includes both:

- CLI startup and argument handling
- TUI interaction in the terminal

The package is named `packages/cli` (npm package `minicode`) because it is the
entrypoint product boundary. The TUI is an internal implementation detail of the
CLI runtime.

---

## Scope

### In scope (v0)

- CLI command (`minicode`) boots the interactive TUI by default
- OpenTUI footer input using `TextareaRenderable`
- Terminal-native scrollback output (no custom scrollback implementation)
- Command palette in the footer region
- Session switching and model switching from palette and slash commands
- New-session provider/model selection from palette and slash commands
- Plugin-contributed slash commands and palette actions (from SDK)
- Turn streaming via SDK (`Session.send` -> `Turn.events`)
- Queueing and abort behavior for in-flight turns
- No permission prompts in v0 (turn/tool execution is uninterrupted)

### Out of scope (v0)

- Fullscreen UI layouts
- Alternate-screen rendering
- In-app transcript/search panes
- Background job management
- Rich visual themes and animations
- Permission confirmation dialogs

---

## APOSD Design Principles

- Information hiding: CLI/TUI never touches provider internals or tool plumbing.
- Deep modules: one app coordinator owns state transitions and turn lifecycle.
- Consistent naming: Session, TurnRequest, TurnResponse, TurnEvent, ToolOutput.
- Stable boundaries: SDK is the only dependency for agent/session operations.
- Simplicity over options: small command set, predictable keybindings.
- Unified action model: built-in and plugin actions use the same command bus.

---

## Runtime Model

- Package: `packages/cli`
- Public binary: `minicode`
- Default mode: interactive (starts TUI)
- Product flow:
  1. Parse CLI args with Zod
  2. Create SDK (`createMinicode`)
  3. Open target session
  4. Start OpenTUI footer
  5. Stream turn output to stdout

---

## Terminal Contract (Non-Fullscreen)

The app must never take over the full terminal viewport.

- `useAlternateScreen: false`
- `useConsole: false`
- `renderer.experimental_splitHeight = footerHeight`
- Only the footer is managed by OpenTUI
- All conversation/tool output is written to standard stdout
- Terminal scrollback remains the source of truth for history

Never call `process.exit()` directly. Exit via `renderer.destroy()`.

---

## CLI Contract

### Command behavior

- `minicode` starts interactive mode
- `minicode --help` prints command/flag help
- `minicode --version` prints version

### Core flags (v0)

- `--session <id>` resume a session
- `--new-session` force create a new session
- `--provider <provider-id>` runtime override for new sessions only
- `--model <model-id>` runtime override (same-provider when resuming)
- `--footer-height <rows>` footer split height
- `--cwd <path>` working directory override

Args are parsed and validated via Zod (`cli/schema.ts`).

---

## TUI Interaction Model

### Input

- Footer contains a bordered container and `TextareaRenderable`
- `Enter`: newline
- `Ctrl+Enter`: submit prompt

### Global keys

- `Ctrl+K`: open command palette
- `Ctrl+C`: abort active turn; if idle, exit
- `Esc`: close palette (if open) or exit app (if idle)

### Concurrency

- Single active turn at a time
- Submissions while active are queued FIFO
- Queue status is printed to stdout (`[queued]`)
- Control commands execute immediately while streaming (`/abort`, `/exit`, `Ctrl+C`)
- Immediate control commands must be graceful and idempotent
- `/abort`: cancel active turn immediately; no-op when idle
- `/exit`: if streaming, abort then exit after turn settles; if idle, exit immediately

---

## Command Palette (v0)

Palette lives in the footer region (never fullscreen).
Plugin action contract is defined in plans/plugins.md.

### Actions

- New session
- Switch session
- Switch model
- Abort active turn
- Help
- Exit

### Model/provider runtime behavior

- Palette reads options from `sdk.getRuntimeCatalog()`
- Model switch for active session uses `sdk.openSession({ id, runtime: { model } })`
- Provider change creates a new session with runtime override
- Existing session ids keep their provider fixed for lifetime
- Session metadata reflects the selected runtime for that session id

### Plugin actions

- Palette includes built-in actions first, then plugin actions.
- Slash command parser resolves built-in and plugin command ids through one router.
- Plugin actions come from globally loaded SDK plugins only.

Slash-command parity (v0):

- `/new`, `/new --provider <id> --model <id>`, `/sessions`, `/use <id>`, `/model <id>`, `/abort`, `/exit`

---

## Turn Event Rendering Policy

Map `TurnEvent` to stdout consistently:

- `text_delta`: stream raw text
- `tool_call`: one-line marker with tool name
- `tool_result`: one-line summary (exit code/truncation/artifact if present)
- `tool_error`: one-line error marker
- `finish`: ensure trailing newline and return to ready state
- `abort`: print `[interrupted by user]`
- `error`: print `[error] <message>`

Abort transcript behavior:

- Keep partial assistant text that streamed before the abort.
- Append a `user` message `[interrupted by user]` to the transcript.

Reasoning output is off by default in v0.

---

## Zod Boundaries in CLI/TUI

Use Zod for:

- CLI args
- Slash command payloads
- Palette action payloads

Do not over-validate internal ephemeral UI state.

---

## Exact File List and Responsibilities

`packages/cli/`

- `package.json`
  - binary mapping (`minicode`), dependencies, scripts
- `tsconfig.json`
  - strict TS configuration

`src/`

- `index.ts`
  - process entrypoint, delegates to `cli/start.ts`

`src/cli/`

- `args.ts`
  - raw argv extraction and normalization
- `schema.ts`
  - Zod schemas for args and option parsing
- `start.ts`
  - bootstrap SDK + open session + launch app coordinator

`src/app/`

- `app.ts`
  - deep coordinator: lifecycle, key routing, turn loop, palette mode
- `queue.ts`
  - in-flight turn tracking and FIFO queue logic
- `commands.ts`
  - slash command parsing + execution against SDK/session

`src/ui/`

- `footer.ts`
  - split-footer renderables + textarea wiring
- `palette.ts`
  - command palette UI and action selection state
- `stdout.ts`
  - stdout write helper + debounced `renderer.requestRender()`
- `event-renderer.ts`
  - `TurnEvent` -> stdout text mapping

`src/util/`

- `errors.ts`
  - normalize unknown errors for user-facing output

---

## Implementation Phases

1. Scaffold CLI package and `minicode` bin entry.
2. Implement arg parsing (`args.ts` + `schema.ts`) and bootstrap (`start.ts`).
3. Build footer textarea and key handling (`footer.ts`).
4. Build app coordinator and turn queue (`app.ts`, `queue.ts`).
5. Build stdout bridge and event renderer (`stdout.ts`, `event-renderer.ts`).
6. Add command palette (`palette.ts`) and slash command parity (`commands.ts`).
7. Wire model switching through SDK `openSession({ id, runtime: { model } })`.
8. Wire new-session provider selection through SDK runtime overrides.
9. Wire plugin-contributed commands/actions into slash parser and palette.
10. Add tests for args, queue logic, command routing, plugin action routing,
    and event rendering.

---

## Acceptance Criteria

- `minicode` launches interactive mode and opens footer textarea.
- App never switches to alternate screen and never becomes fullscreen.
- Output streams into terminal scrollback while footer stays interactive.
- Command palette works in footer region and supports session switching,
  same-provider model switching, and new-session provider selection.
- Plugin-contributed commands/actions appear and execute through the same UI paths.
- Model can be switched within the same provider without restarting the process.
- Changing provider creates a new session with the selected runtime.
- Turn queue and abort behavior are deterministic and user-visible.
- No permission prompt interrupts turn/tool execution in v0.

---

## Risks and Mitigations

- Footer redraw glitches while streaming:
  - centralize writes through `ui/stdout.ts` and request debounced re-render
- State explosion from palette + queue + streaming:
  - keep one coordinator (`app.ts`) as the single state owner
- Provider/model switch confusion:
  - always print whether runtime change is model-in-session or new-session provider selection
- Plugin command failures:
  - isolate failure to command execution and keep app/session alive
- OpenTUI instability:
  - isolate OpenTUI usage to `ui/*`; keep business logic in `app/*`
