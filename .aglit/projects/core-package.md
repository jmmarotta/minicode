---
schema: aglit.project.md.v1
id: 019c4f3c-e5a1-7000-b771-ab987f1de799
status: planned
priority: high
---

# Core Package

## Description

Implement the deep `@minicode/core` abstractions for Agent, Session, and Turn on top of AI SDK streams.

## Scope

- Define turn/event/tool output types and boundary schemas.
- Implement stream mapping and response aggregation behind a minimal public API.
- Provide Session transcript ownership and snapshot boundaries.
- Keep core plugin-agnostic and policy-agnostic.

## Milestones

- Core types and schemas are stable and exported.
- Agent wrapper and Session lifecycle are implemented.
- Stream mapping and ToolOutput conversion have unit coverage.

## Notes

- Source plan: `plans/core.md`.
