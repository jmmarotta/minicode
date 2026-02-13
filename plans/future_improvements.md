# Future Improvements

Date: 2026-02-10
Status: Backlog (post-v0)

This file tracks improvements that are intentionally deferred from the v0 rewrite.

---

## Deferred from v0

- Git-based rollback/checkpoints for workspace changes made during agent turns.
- Prompt file selector using `@` mentions (similar to Claude Code and OpenCode).
- Vim mode for editing and navigation in the CLI footer input.
- Accepting image inputs in prompts for multimodal workflows.

---

## Git-Based Rollback (Planned)

### Goal

- Let users create and restore checkpoints using Git so changes can be rolled back safely.

### Scope

- Git repositories only.
- Includes tracked and untracked files.
- Applies to all file mutations, including changes made through `bash`.

### Proposed approach

1. Before a mutating turn starts, create a Git checkpoint id.
2. Record checkpoint metadata in the session (timestamp, session id, turn id, checkpoint id).
3. Expose rollback actions in CLI (`/checkpoint`, `/rollback <id>`, palette equivalents).
4. On rollback, restore repository state to the selected checkpoint and print a clear summary.

### Safety and UX notes

- Never run destructive rollback automatically; rollback is always user-triggered.
- Print what will be changed before executing rollback.
- Fail clearly when repository state prevents safe restore.

### Open questions for implementation phase

- Exact Git strategy (stash-based vs checkpoint commits/refs).
- Behavior when working tree is already dirty before checkpoint creation.
- Handling nested repos/submodules and large binary files.

---

## Prompt File Selector (`@`) (Planned)

### Goal

- Let users reference files quickly by typing `@` in the prompt input and selecting matches.

### Scope

- Footer prompt input only (interactive CLI mode).
- Works with relative paths and fuzzy filename matching.
- Inserts selected file path(s) into the prompt in a consistent format.

### Proposed approach

1. Detect `@` trigger in the textarea and open a lightweight selector overlay in the footer region.
2. Query files from the current working directory with ignore rules (e.g., `.git`, `node_modules`, large generated dirs).
3. Support keyboard-first navigation and multi-select insertion.
4. Keep selector behavior consistent with slash/palette keybindings and queueing behavior.

### Open questions for implementation phase

- Final matching strategy (prefix vs fuzzy vs scored hybrid).
- Whether to include git-ignored files by default.
- Max result count and truncation behavior in very large repos.

---

## Vim Mode (Planned)

### Goal

- Provide optional modal editing for power users in the footer textarea.

### Scope

- Optional setting (`ui.vimMode`) with default off.
- Normal/insert mode switching, cursor movement, and basic editing commands.
- Should not break existing default keybindings for non-vim users.

### Proposed approach

1. Add a vim keymap layer in the footer input controller.
2. Implement minimal command set first (`h/j/k/l`, word motions, delete/change, `i`, `a`, `o`, `Esc`).
3. Show mode indicator in footer status area.
4. Extend gradually with additional motions/text objects based on usage feedback.

### Open questions for implementation phase

- Whether to build in-house key handling or integrate a small vim-editing library.
- Which command set is required for a useful v1 of vim mode.
- How vim mode interacts with palette shortcuts and global app controls.

---

## Image Inputs (Planned)

### Goal

- Let users attach local images to prompts and send them to providers that support vision/multimodal input.

### Scope

- Support image references from CLI prompt flows (file path and selector-based attach).
- Validate file type and size before sending.
- Preserve image references in session history in a provider-agnostic format.

### Proposed approach

1. Add an attachment model in core/SDK turn request types.
2. Add CLI affordances to attach images (slash command and selector integration).
3. Resolve local files, validate limits, and map to provider-specific input parts.
4. Surface clear errors when provider/runtime does not support image input.

### Open questions for implementation phase

- Which image formats and size limits should be supported in v1.
- How attachments should be represented in exported session JSON.
- Whether to inline bytes, pass file URLs, or use provider upload APIs per backend.
