import { ToolLoopAgent, type ModelMessage, type ToolSet } from "ai"
import { createTurnFromStream } from "./stream"
import type { Agent, CreateAgentOptions, Turn, TurnRequest } from "./types"

function buildMessages(request: TurnRequest, transcript: Array<ModelMessage>): Array<ModelMessage> {
  if ("messages" in request && request.messages) {
    return [...transcript, ...(request.messages as Array<ModelMessage>)]
  }

  const prompt = request.prompt.trim()
  if (!prompt) {
    throw new Error("Turn request prompt must not be empty")
  }

  return [
    ...transcript,
    {
      role: "user",
      content: prompt,
    },
  ]
}

export function createAgent<Tools extends ToolSet>(options: CreateAgentOptions<Tools>): Agent {
  const loopAgent = new ToolLoopAgent({
    model: options.model,
    tools: options.tools,
    instructions: options.instructions,
    stopWhen: options.stopWhen,
    onStepFinish: options.onStepFinish,
  })

  return {
    runTurn(request: TurnRequest, transcript: Array<ModelMessage> = []): Turn {
      const abortController = new AbortController()
      const abortSignal = request.abortSignal ?? abortController.signal
      const abort = () => {
        abortController.abort()
      }

      const streamPromise = loopAgent.stream({
        messages: buildMessages(request, transcript),
        abortSignal,
      })

      const turnPromise = streamPromise.then((streamResult) => createTurnFromStream(streamResult, abort))

      return {
        events: (async function* () {
          const turn = await turnPromise
          for await (const event of turn.events) {
            yield event
          }
        })(),
        response: turnPromise.then((turn) => turn.response),
        abort,
      }
    },
  }
}
