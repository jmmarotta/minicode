---
schema: aglit.issue.md.v1
id: 019c4f3d-3335-7000-b6ac-fd93aeed4b56
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Build stdout bridge and TurnEvent renderer

## Description

- Implement stdout bridge and turn event renderer so streaming output and tool markers are printed consistently without footer glitches.

## Acceptance

- All app-originated stdout writes route through a redraw-aware helper.
- `TurnEvent` kinds render to stable, grep-able line formats.
- Finish/error/abort cases restore ready state cleanly.

## Constraints

- Keep rendering pure and deterministic from event input.
- Avoid excessive render thrashing with debounced redraw requests.

## Plan

1. Implement stdout wrapper with `requestRender` integration.
2. Implement `TurnEvent` to text mapping policy.
3. Wire event renderer into active turn stream handling.
4. Validate behavior under high-frequency text deltas.

## Verification

- Manual run with tool calls and streaming text to confirm output markers.
- Validate no footer corruption during heavy stdout output.

## Completed

- Implemented redraw-aware stdout bridge in `packages/cli/src/ui/stdout.ts` with debounced `requestRender` behavior.
- Implemented deterministic `TurnEvent` line mapping in `packages/cli/src/ui/event-renderer.ts`.
- Wired bridge + renderer into active turn streaming flow in `packages/cli/src/app/app.ts`.
- Added renderer coverage in `packages/cli/src/ui/event-renderer.test.ts`.

## Verified

- `bun test packages/cli/src/ui/event-renderer.test.ts`
- `bun test packages/cli/src`
