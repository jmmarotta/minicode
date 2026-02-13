---
schema: aglit.issue.md.v1
id: 019c4f3d-2f80-7000-9c9e-17818e452ff6
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Prototype OpenTUI split-footer textarea and stdout stability

## Description

- Build a prototype split-footer OpenTUI input area that remains stable while stdout scrollback is continuously written.

## Acceptance

- Footer textarea is visible and accepts multiline input.
- `Ctrl+Enter` submission prints input content to stdout.
- Repeated stdout writes do not break footer rendering.

## Constraints

- Do not use alternate-screen/fullscreen mode.
- Keep the prototype focused on footer and stdout integration only.

## Plan

1. Initialize OpenTUI renderer with split-height configuration.
2. Implement footer container and textarea wiring with keybindings.
3. Add stdout write helper that triggers debounced footer redraw.
4. Stress test redraw behavior with repeated output.

## Verification

- Manual test: type while printing many lines to stdout and confirm stable footer.
- Manual test: submit multiline text and confirm expected printed output.

## Progress

- Added an OpenTUI split-footer prototype in `packages/cli/src/index.ts` using `experimental_splitHeight` and a focused `TextareaRenderable`.
- Added a stdout bridge in `packages/cli/src/ui/stdout.ts` that writes to stdout and debounces footer redraw requests.
- Wired `Ctrl+Enter` submit to print multiline textarea content to stdout.
- Wired `Ctrl+R` stress output to print many lines while footer stays interactive.

## Completed

- Refactored footer prototype into `packages/cli/src/ui/footer.ts` so split-footer setup and stress writer are isolated from entrypoint bootstrap.
- Added `MINICODE_SMOKE_TEST=1` mode in `packages/cli/src/index.ts` to auto-submit multiline input, run stress writes, and validate output markers without manual keypresses.
- Added smoke-output capture hooks to `packages/cli/src/ui/stdout.ts` so automated verification can assert expected write segments.
- Verified:
  - `bun run typecheck`
  - `bunx oxlint --type-aware packages/cli/src/index.ts packages/cli/src/ui/footer.ts packages/cli/src/ui/stdout.ts`
  - `MINICODE_SMOKE_TEST=1 OTUI_NO_NATIVE_RENDER=true bun run packages/cli/src/index.ts > /tmp/mini4-smoke.log 2>&1`
