---
schema: aglit.issue.md.v1
id: 019c4f3d-32ec-7000-b620-e251e9ca7ca8
status: done
priority: medium
projectId: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
---

# Build split-footer textarea UI and key handling

## Description

- Build the split-footer textarea UI and key handling for multiline input and prompt submission.

## Acceptance

- Footer uses split mode and remains fixed at the bottom.
- `Enter` inserts newline and `Ctrl+Enter` submits.
- Footer layout remains usable across common terminal sizes.

## Constraints

- No alternate screen usage.
- Keep footer implementation isolated from app business logic.

## Plan

1. Implement footer renderables and textarea wiring.
2. Add key handling for submit/newline behavior.
3. Add status/placeholder messaging for idle and streaming states.
4. Integrate footer callbacks with app coordinator.

## Verification

- Manual test multiline editing and submit behavior.
- Manual test resize scenarios for footer stability.

## Completed

- Implemented split-footer prompt UI in `packages/cli/src/ui/footer.ts` and wired it in `packages/cli/src/app/app.ts` with fixed footer rendering.
- Added multiline input handling where `Enter` inserts newline and `Ctrl+Enter` submits via textarea key bindings.
- Added footer status messaging for ready/streaming and palette visibility.

## Verified

- `bun test packages/cli/src`
