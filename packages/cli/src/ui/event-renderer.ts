import type { TurnEvent } from "@minicode/sdk"

type ToolOutputLike = {
  ok?: boolean
  outputMessage?: string
  meta?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeToolOutput(output: unknown): ToolOutputLike {
  if (!isRecord(output)) {
    return {}
  }

  const meta = isRecord(output.meta) ? output.meta : undefined

  return {
    ok: typeof output.ok === "boolean" ? output.ok : undefined,
    outputMessage: typeof output.outputMessage === "string" ? output.outputMessage : undefined,
    meta,
  }
}

function summarizeToolMeta(meta?: Record<string, unknown>): string {
  if (!meta) {
    return ""
  }

  const parts: string[] = []

  if (typeof meta.exitCode === "number") {
    parts.push(`exit=${meta.exitCode}`)
  }

  if (meta.truncated === true) {
    parts.push("truncated")
  }

  if (typeof meta.artifactId === "string") {
    parts.push(`artifact=${meta.artifactId}`)
  }

  if (typeof meta.artifactPath === "string") {
    parts.push(`artifact=${meta.artifactPath}`)
  }

  if (parts.length === 0) {
    return ""
  }

  return ` (${parts.join(", ")})`
}

export type TurnEventRenderer = {
  render: (event: TurnEvent) => string
  renderUnknownError: (message: string) => string
}

export function createTurnEventRenderer(): TurnEventRenderer {
  let textLineOpen = false
  let sawErrorEvent = false

  const ensureBreak = () => {
    if (!textLineOpen) {
      return ""
    }

    textLineOpen = false
    return "\n"
  }

  return {
    render(event) {
      switch (event.type) {
        case "text_delta": {
          textLineOpen = true
          return event.text
        }

        case "reasoning_delta": {
          return ""
        }

        case "tool_call": {
          return `${ensureBreak()}[tool:${event.toolName}] call\n`
        }

        case "tool_result": {
          const output = normalizeToolOutput(event.output)
          const status = output.ok === false ? "failed" : "result"
          const detail = summarizeToolMeta(output.meta)
          return `${ensureBreak()}[tool:${event.toolName}] ${status}${detail}\n`
        }

        case "tool_error": {
          return `${ensureBreak()}[tool:${event.toolName}] error: ${event.error.message}\n`
        }

        case "step_finish": {
          return ""
        }

        case "finish": {
          return ensureBreak()
        }

        case "abort": {
          return `${ensureBreak()}[interrupted by user]\n`
        }

        case "error": {
          sawErrorEvent = true
          return `${ensureBreak()}[error] ${event.error.message}\n`
        }
      }
    },

    renderUnknownError(message: string) {
      if (sawErrorEvent) {
        return ""
      }

      return `${ensureBreak()}[error] ${message}\n`
    },
  }
}
