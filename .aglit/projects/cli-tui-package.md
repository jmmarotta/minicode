---
schema: aglit.project.md.v1
id: 019c4f3c-e5e4-7000-b372-e326a7e98a9c
status: planned
priority: high
---

# CLI and TUI Package

## Description

Deliver the user-facing `minicode` CLI with a split-footer OpenTUI input and stdout-first interaction model.

## Scope

- Implement CLI startup, argument parsing, and session bootstrapping.
- Build footer input, keybindings, queueing, and abort behavior.
- Render turn events to stdout while keeping footer interaction stable.
- Provide palette/slash action routing including plugin-contributed actions.

## Milestones

- Interactive footer and queue lifecycle are stable.
- Palette and slash commands support runtime/session workflows.
- Tests cover args, routing, and rendering behavior.

## Notes

- Source plan: `plans/tui.md`.
