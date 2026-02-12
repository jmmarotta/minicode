---
schema: aglit.issue.md.v1
id: 019c4f3d-2f0f-7000-be69-f3b25438fa1b
status: done
priority: high
projectId: 019c4f3c-e57a-7000-8ec3-b8c03ba57ce9
---

# Preserve legacy baseline before rewrite

## Description

- Capture a safe legacy baseline before rewrite work begins so we can compare behavior and recover quickly if needed.

## Acceptance

- A baseline branch/tag strategy is documented for the rewrite effort.
- Current startup and validation commands are recorded with expected behavior.
- No functional code is removed as part of baseline capture.

## Constraints

- Do not rewrite or delete existing history.
- Keep baseline capture lightweight and reproducible.

## Plan

1. Record current git state and identify the baseline commit.
2. Create the baseline branch/tag artifacts and note their names.
3. Capture current run/lint/typecheck commands and observed outputs.
4. Store the baseline notes in project docs.

## Verification

- Confirm baseline references exist and point to the expected commit.
- Confirm recorded commands can still be executed from a clean checkout.

## Completed

- Captured baseline in `docs/rewrite-baseline.md`.
- Created baseline refs at commit `9933868`:
  - `rewrite/agent-v2`
  - `legacy-pre-rewrite-2026-02-11`
