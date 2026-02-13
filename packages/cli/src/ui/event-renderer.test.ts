import { describe, expect, test } from "bun:test"
import type { TurnEvent } from "@minicode/sdk"
import { createTurnEventRenderer } from "./event-renderer"

describe("turn event renderer", () => {
  test("emits trailing newline on finish after text streaming", () => {
    const renderer = createTurnEventRenderer()

    expect(
      renderer.render({
        type: "text_delta",
        text: "hello",
      }),
    ).toBe("hello")

    expect(
      renderer.render({
        type: "finish",
        finishReason: "stop",
        totalUsage: {},
      } as TurnEvent),
    ).toBe("\n")
  })

  test("renders tool result meta summary", () => {
    const renderer = createTurnEventRenderer()

    const line = renderer.render({
      type: "tool_result",
      toolCallId: "call_1",
      toolName: "bash",
      input: {
        command: "ls",
      },
      output: {
        ok: true,
        outputMessage: "Command succeeded",
        meta: {
          exitCode: 0,
          truncated: true,
          artifactId: "artifact-1",
        },
      },
    } as TurnEvent)

    expect(line).toContain("[tool:bash] result")
    expect(line).toContain("exit=0")
    expect(line).toContain("truncated")
    expect(line).toContain("artifact=artifact-1")
  })

  test("does not duplicate fallback error after error event", () => {
    const renderer = createTurnEventRenderer()

    expect(
      renderer.render({
        type: "error",
        error: {
          name: "Error",
          message: "boom",
        },
      }),
    ).toBe("[error] boom\n")

    expect(renderer.renderUnknownError("second failure")).toBe("")
  })
})
