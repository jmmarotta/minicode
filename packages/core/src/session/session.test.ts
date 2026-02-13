import { describe, expect, test } from "bun:test"
import type { Turn, TurnRequest, TurnResponse } from "../runner"
import { SessionStateSchema, createSession, type SessionState } from "./session"

const ZERO_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
}

function createTurn(response: TurnResponse, onAbort?: () => void): Turn {
  return {
    events: (async function* () {
      // no-op
    })(),
    response: Promise.resolve(response),
    abort: () => {
      onAbort?.()
    },
  }
}

describe("createSession", () => {
  test("send and turn use configured runner and grow transcript deterministically", async () => {
    const seenTranscripts: Array<Array<{ role: string }>> = []
    let turnCount = 0

    const session = createSession({
      state: {
        id: "session-1",
        createdAt: 100,
        updatedAt: 100,
        messages: [] as SessionState["messages"],
      },
      runTurn(request, transcript) {
        seenTranscripts.push(transcript.map((message) => ({ role: message.role })))
        turnCount += 1

        const response: TurnResponse = {
          text: `reply-${turnCount}`,
          responseMessages: [
            {
              role: "assistant",
              content: `reply-${turnCount}`,
            },
          ],
          finishReason: "stop",
          totalUsage: ZERO_USAGE,
        }

        return createTurn(response)
      },
      now: () => 200,
    })

    const first = session.send("first prompt")
    await first.response

    const second = session.turn({ prompt: "second prompt" })
    await second.response

    const snapshot = session.snapshot()

    expect(seenTranscripts).toEqual([[], [{ role: "user" }, { role: "assistant" }]])
    expect(snapshot.messages).toEqual([
      { role: "user", content: "first prompt" },
      { role: "assistant", content: "reply-1" },
      { role: "user", content: "second prompt" },
      { role: "assistant", content: "reply-2" },
    ])
    expect(snapshot.updatedAt).toBe(200)
  })

  test("preserves partial assistant output and appends interruption marker on abort", async () => {
    const session = createSession({
      state: {
        id: "session-abort",
        createdAt: 1,
        updatedAt: 1,
        messages: [] as SessionState["messages"],
      },
      runTurn(_request: TurnRequest) {
        return createTurn({
          text: "partial output",
          responseMessages: [],
          finishReason: "abort",
          totalUsage: ZERO_USAGE,
        })
      },
      now: () => 2,
    })

    await session.send("do work").response

    expect(session.snapshot().messages).toEqual([
      { role: "user", content: "do work" },
      { role: "assistant", content: "partial output" },
      { role: "user", content: "[interrupted by user]" },
    ])
  })

  test("supports snapshot hooks and turn handle abort", async () => {
    const snapshots: Array<number> = []
    let abortCalls = 0

    type ExtendedState = SessionState & {
      revision: number
    }

    const session = createSession<ExtendedState>({
      state: {
        id: "session-hooks",
        createdAt: 10,
        updatedAt: 10,
        messages: [],
        revision: 0,
      },
      runTurn() {
        return createTurn(
          {
            text: "ok",
            responseMessages: [{ role: "assistant", content: "ok" }],
            finishReason: "stop",
            totalUsage: ZERO_USAGE,
          },
          () => {
            abortCalls += 1
          },
        )
      },
      applyResponse({ nextState }) {
        return {
          ...nextState,
          revision: nextState.revision + 1,
        }
      },
      onSnapshot(snapshot) {
        snapshots.push(snapshot.revision)
      },
      now: () => 11,
    })

    const turn = session.send("hello")
    turn.abort()
    await turn.response

    expect(abortCalls).toBe(1)
    expect(snapshots).toEqual([1])
    expect(session.snapshot().revision).toBe(1)
  })

  test("validates session state fixtures with SessionStateSchema", () => {
    const valid = {
      id: "session-fixture",
      createdAt: 1,
      updatedAt: 2,
      messages: [{ role: "user", content: "hello" }],
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
    }

    expect(SessionStateSchema.parse(valid)).toMatchObject(valid)

    expect(() =>
      SessionStateSchema.parse({
        createdAt: 1,
        updatedAt: 1,
        messages: [],
      }),
    ).toThrow()

    expect(() =>
      SessionStateSchema.parse({
        id: "broken",
        createdAt: 1,
        updatedAt: 1,
        messages: [{ role: "user" }],
      }),
    ).toThrow()
  })
})
