import { z } from "zod"
import { TurnMessageSchema, TurnUsageSchema } from "../runner"
import type { Turn, TurnMessage, TurnRequest, TurnResponse } from "../runner"

export const DEFAULT_INTERRUPTION_MARKER = "[interrupted by user]"

export const SessionStateSchema = z.looseObject({
  id: z.string().trim().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  messages: z.array(TurnMessageSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
  usageTotals: TurnUsageSchema.optional(),
})

export type SessionState = z.output<typeof SessionStateSchema>

export type Session<State extends SessionState = SessionState> = {
  readonly id: string
  send(prompt: string, options?: { abortSignal?: AbortSignal }): Turn
  turn(request: TurnRequest): Turn
  snapshot(): State
}

export type CreateSessionOptions<State extends SessionState = SessionState> = {
  state: State
  runTurn: (request: TurnRequest, transcript: Array<TurnMessage>) => Turn
  now?: () => number
  interruptionMarker?: string
  onSnapshot?: (snapshot: State) => Promise<void> | void
  applyResponse?: (input: {
    previousState: State
    nextState: State
    request: TurnRequest
    requestMessages: Array<TurnMessage>
    response: TurnResponse
  }) => State
}

function cloneState<State extends SessionState>(state: State): State {
  return structuredClone(state)
}

function requestMessagesForSession(request: TurnRequest): Array<TurnMessage> {
  if ("messages" in request && request.messages) {
    return request.messages
  }

  const prompt = request.prompt.trim()
  if (!prompt) {
    throw new Error("Turn request prompt must not be empty")
  }

  return [
    {
      role: "user",
      content: prompt,
    },
  ]
}

function hasAssistantMessage(messages: Array<TurnMessage>): boolean {
  return messages.some((message) => message.role === "assistant")
}

function appendAbortMessages(
  response: TurnResponse,
  messages: Array<TurnMessage>,
  interruptionMarker: string,
): Array<TurnMessage> {
  const next = [...messages]

  if (response.text.trim().length > 0 && !hasAssistantMessage(response.responseMessages)) {
    next.push({
      role: "assistant",
      content: response.text,
    })
  }

  next.push({
    role: "user",
    content: interruptionMarker,
  })

  return next
}

function buildNextState<State extends SessionState>(input: {
  state: State
  requestMessages: Array<TurnMessage>
  response: TurnResponse
  now: () => number
  interruptionMarker: string
}): State {
  const baseMessages = [...input.state.messages, ...input.requestMessages, ...input.response.responseMessages]

  const messages =
    input.response.finishReason === "abort"
      ? appendAbortMessages(input.response, baseMessages, input.interruptionMarker)
      : baseMessages

  return {
    ...input.state,
    updatedAt: input.now(),
    messages,
  }
}

export function createSession<State extends SessionState>(options: CreateSessionOptions<State>): Session<State> {
  const now = options.now ?? Date.now
  const interruptionMarker = options.interruptionMarker ?? DEFAULT_INTERRUPTION_MARKER

  let state = cloneState(SessionStateSchema.parse(options.state) as State)
  let commitQueue: Promise<void> = Promise.resolve()

  const commitResponse = async (
    request: TurnRequest,
    requestMessages: Array<TurnMessage>,
    response: TurnResponse,
  ): Promise<void> => {
    commitQueue = commitQueue.then(async () => {
      const nextState = SessionStateSchema.parse(
        buildNextState({
          state,
          requestMessages,
          response,
          now,
          interruptionMarker,
        }),
      ) as State

      const appliedState = options.applyResponse
        ? options.applyResponse({
            previousState: state,
            nextState,
            request,
            requestMessages,
            response,
          })
        : nextState

      const validatedState = SessionStateSchema.parse(appliedState) as State
      state = cloneState(validatedState)
      if (options.onSnapshot) {
        await options.onSnapshot(cloneState(validatedState))
      }
    })

    await commitQueue
  }

  const turn = (request: TurnRequest): Turn => {
    const requestMessages = requestMessagesForSession(request)
    const run = options.runTurn(request, state.messages)

    const response = run.response.then(async (result) => {
      await commitResponse(request, requestMessages, result)
      return result
    })

    return {
      events: run.events,
      response,
      abort: run.abort,
    }
  }

  return {
    get id() {
      return state.id
    },

    send(prompt: string, sendOptions?: { abortSignal?: AbortSignal }): Turn {
      return turn({
        prompt,
        abortSignal: sendOptions?.abortSignal,
      })
    },

    turn,

    snapshot() {
      return cloneState(state)
    },
  }
}
