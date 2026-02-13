---
schema: aglit.issue.md.v1
id: 019c4f3d-3015-7000-9258-a55e17387fa2
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Wire CLI and TUI end-to-end with queue, abort, and palette actions

## Description

- Wire CLI and TUI to SDK for a full interactive loop with streaming output, queueing, abort controls, and palette actions.

## Acceptance

- Prompt submissions stream turn output into scrollback with fixed footer input.
- Queue and abort behavior match the v0 interaction contract.
- Palette/slash actions execute through a shared command routing path.

## Constraints

- Keep one active turn at a time with deterministic FIFO queueing.
- Do not block control commands while streaming.

## Plan

1. Connect footer submit events to `Session.send`.
2. Render `TurnEvent` updates to stdout consistently.
3. Implement in-flight queue and immediate control commands.
4. Add session/model/new-session actions in palette and slash router.

## Verification

- Manual test queueing by sending prompts while streaming and observing `[queued]` behavior.
- Manual test `/abort`, `/exit`, model switch, and session switch flows.

## Completed

- Wired CLI startup and runtime bootstrap with validated args (`--session`, `--new-session`, `--provider`, `--model`, `--footer-height`, `--cwd`) and SDK session open flow.
- Implemented app coordinator with one active turn, deterministic FIFO queueing, abort handling, and redraw-safe stdout streaming.
- Added shared command routing for slash and palette paths with built-ins: `new`, `sessions`, `use`, `model`, `abort`, `help`, `exit`.
- Reworked footer UI to include fixed prompt input, streaming/session status, and footer-region command palette toggle (`Ctrl+K`).
- Added deterministic `TurnEvent` renderer for text/tool/error/abort output markers and updated stdout bridge helpers.
- Added CLI tests for queue behavior, command routing parity, and event rendering behavior.
- Verified with:
  - `bun test packages/cli/src`
  - `bun run typecheck` (in `packages/cli`)
  - PTY smoke run of `bun run packages/cli/src/index.ts --provider openai-compatible --model gpt-4o-mini` validating startup, palette open (`Ctrl+K`), and clean exit (`Ctrl+C`).
