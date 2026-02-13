# Core Package Plan

Date: 2026-02-04
Status: Draft plan for packages/core

This plan defines the core abstractions (Agent, Session, Turn) built on AI SDK
ToolLoopAgent. It follows A Philosophy of Software Design by hiding stream and
tool-loop complexity behind small, deep interfaces.

---

## Design Principles (APOSD)

- Information hiding: callers never touch ToolLoopAgent or stream plumbing.
- Deep modules: Session and Agent do real work behind small interfaces.
- Consistent naming: Agent, Session, Turn, TurnRequest, TurnResponse, TurnEvent,
  ToolOutput.
- One abstraction per concept: Session owns transcript; Agent owns behavior.
- Stable surfaces: public types are minimal and avoid AI SDK implementation
  details except where they add real value (ModelMessage, Tool).
- Zod at boundaries: persisted state, cross-module events, and tool envelopes are
  validated with schemas.
- Plugin-agnostic core: plugin loading/composition belongs to SDK, not core.
- Policy-agnostic core: no runtime permission prompt/check logic in core.

---

## Public API (core)

Exports from packages/core:

- createAgent(init): Agent
- createSession(init): Session
- Types: Agent, Session, Turn, TurnRequest, TurnResponse, TurnEvent, ToolOutput,
  ProviderId
- SessionState + SessionStateSchema (zod)
- defineTool(...) helper for consistent ToolOutput handling

TurnRequest and TurnResponse are the request/response pair for one turn.
Turn is the streaming handle that exposes events and resolves to TurnResponse.

ProviderId is defined in core as:

```
type ProviderId = "openai" | "anthropic" | "google" | "openai-compatible"
```

SDK reuses this type to keep session/provider typing consistent across packages.

---

## Core Abstractions

### Agent

- Immutable configuration: model, tools, instructions, stopWhen.
- Wraps ToolLoopAgent internally.
- Exposes runTurn(TurnRequest, transcript) -> Turn.
- Does not store session state.

### Session

- Stateful conversation object with id, transcript, metadata.
- Owns the transcript and updates it when a Turn completes.
- Exposes send(text, opts?) -> Turn and turn(request) -> Turn.
- Provides snapshot() -> SessionState for persistence.
- Accepts an optional SessionRepository interface (defined in core) for hooks.

### Turn

- In-flight execution handle.
- events: AsyncIterable<TurnEvent>
- response: Promise<TurnResponse>
- abort(): signals cancellation for the current turn

---

## Tool Output Convention

### ToolOutput

Unified tool return envelope used across all tools:

```
type ToolOutput<Details = unknown> = {
  ok: boolean
  outputMessage: string
  details?: Details
  meta?: Record<string, unknown>
}
```

### defineTool helper

- Wraps AI SDK tool() and enforces ToolOutput shape via zod.
- Sets toModelOutput so the model sees outputMessage only.
  - ok=true -> { type: "text", value: outputMessage }
  - ok=false -> { type: "error-text", value: outputMessage }
- Keeps details/meta available to the UI via tool result outputs without
  polluting the model context.

---

## Turn Response

TurnResponse should carry the minimal delta required to extend a transcript:

```
type TurnResponse = {
  text: string
  responseMessages: Array<AssistantModelMessage | ToolModelMessage>
  finishReason: FinishReason
  totalUsage: LanguageModelUsage
}
```

The responseMessages are taken directly from AI SDK step.response.messages.
This is the canonical data to append to the transcript.

Abort behavior:

- If a turn is aborted after streaming partial assistant text, Session persists that
  partial assistant output.
- Session also appends a short interruption marker as a `user` message:
  `[interrupted by user]`.

---

## Event Mapping

TurnEvent is derived from AI SDK fullStream events:

- text-delta -> { type: "text_delta", text }
- reasoning-delta -> { type: "reasoning_delta", text }
- tool-call -> { type: "tool_call", toolCallId, toolName, input, providerExecuted }
- tool-result -> { type: "tool_result", toolCallId, toolName, input, output }
- tool-error -> { type: "tool_error", toolCallId, toolName, input, error }
- finish-step -> { type: "step_finish", finishReason, usage }
- finish -> { type: "finish", finishReason, totalUsage }
- abort -> { type: "abort" }
- error -> { type: "error", error }

The mapping is centralized so UI and logging code never handle raw stream parts.

---

## Files and Responsibilities

packages/core/

- package.json
  - Dependencies: ai, zod, @ai-sdk/provider-utils
  - No provider packages (openai/anthropic/google) and no IO libs

- tsconfig.json
  - Strict TS, noEmit, shared base config

- src/index.ts
  - Public exports only (createAgent, createSession, types, schemas)

src/agent/

- agent.ts
  - Agent interface and createAgent implementation
  - Wraps ToolLoopAgent and builds Turn using stream/fullStream

- turn.ts
  - Turn, TurnRequest, TurnResponse types
  - Turn factory to wire events + response promise + abort

- stream.ts
  - Consumes AI SDK fullStream exactly once
  - Maps stream parts to TurnEvent
  - Aggregates TurnResponse from steps + response messages

- events.ts
  - TurnEvent union type
  - Zod schema for validation and serialization

- instructions.ts
  - Minimal default system prompt builder
  - No policy about providers or UI

src/session/

- session.ts
  - Session interface + createSession
  - Owns transcript and updates it on turn completion
  - Exposes snapshot() -> SessionState

- state.ts
  - SessionState type + zod schema
  - Fields: version, id, cwd, createdAt, updatedAt, provider: ProviderId, model,
    messages, metadata?
  - Optional extension fields: usageTotals?, artifacts?

- repository.ts
  - SessionRepository interface with create/load/save/list/delete hooks
  - No filesystem implementation (sdk provides FsSessionRepository in
    packages/sdk/src/session/fs-repository.ts)

src/tools/

- output.ts
  - ToolOutput type + zod schema
  - Helper to map ToolOutput -> model output payload

- define.ts
  - defineTool helper that enforces ToolOutput + toModelOutput
  - Normalizes execute errors into ToolOutput with ok=false

- types.ts
  - ToolName, ToolSet, ToolContext aliases
  - Shared types used by core and sdk

src/util/

- errors.ts
  - serializeError(unknown) -> { name, message }
  - Used in TurnEvent error/tool_error

- ids.ts (optional)
  - generateId helper if we need stable ids outside AI SDK

---

## Implementation Steps (core)

1. Define core types (TurnRequest, TurnResponse, TurnEvent, ToolOutput).
2. Implement defineTool and ToolOutput mapping helpers.
3. Build stream consumer that maps AI SDK fullStream -> TurnEvent.
4. Implement Agent wrapper around ToolLoopAgent.
5. Implement Session with transcript ownership and snapshot.
6. Add Zod schemas for SessionState, TurnEvent, ToolOutput, and serialized errors.
7. Add minimal unit tests for stream mapping and ToolOutput conversion.

---

## Success Criteria

- UI code never touches ToolLoopAgent or raw stream parts.
- Session.send() returns a Turn and auto-appends responseMessages on completion.
- ToolOutput reliably hides UI details from the model via toModelOutput.
- Public surface is small, stable, and matches the naming set above.
