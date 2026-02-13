---
schema: aglit.issue.md.v1
id: 019c4f3d-3433-7000-bd1c-78e38cd70de4
status: planned
priority: medium
projectId: 019c4f3c-e605-7000-aa39-67c68535a0b1
---

# Implement plugin reference normalization for package and file URLs

## Description

- Implement plugin reference normalization for package specifiers and file URLs.

## Acceptance

- Whitespace-trimmed package references preserve exact specifier identity.
- File URLs are canonicalized to normalized absolute form.
- Duplicate references after normalization are detected as conflicts.

## Constraints

- Normalization must be deterministic across platforms.
- Keep normalization logic isolated from module-loading concerns.

## Plan

1. Implement normalizer utility for package and file URL forms.
2. Add canonicalization for path separators/redundant segments.
3. Add duplicate detection helper keyed by normalized reference.
4. Integrate normalizer into plugin load pipeline entrypoint.

## Verification

- Test normalization fixtures for package and file URL edge cases.
- Confirm duplicate normalized references fail fast with clear errors.
