import { describe, expect, test } from "bun:test"
import type { ToolSet } from "ai"
import { composeSdkContributions } from "./compose"
import type { LoadedPlugin } from "./types"

function plugin(input: {
  reference: string
  id: string
  tools?: Record<string, unknown>
  instructionFragments?: string[]
}): LoadedPlugin {
  return {
    reference: input.reference,
    normalizedReference: input.reference,
    plugin: {
      id: input.id,
      apiVersion: 1,
    },
    contribution: {
      sdk: {
        tools: input.tools as ToolSet | undefined,
        instructionFragments: input.instructionFragments,
      },
    },
  }
}

describe("composeSdkContributions", () => {
  test("preserves plugin insertion order for instruction fragments", () => {
    const builtins = {
      read: { description: "read" },
    } as unknown as ToolSet

    const composed = composeSdkContributions(builtins, [
      plugin({
        reference: "plugin-a",
        id: "a",
        instructionFragments: ["a-1", "a-2"],
      }),
      plugin({
        reference: "plugin-b",
        id: "b",
        instructionFragments: ["b-1"],
      }),
    ])

    expect(composed.instructionFragments).toEqual(["a-1", "a-2", "b-1"])
  })

  test("rejects tool name conflicts", () => {
    const builtins = {
      read: { description: "read" },
    } as unknown as ToolSet

    expect(() =>
      composeSdkContributions(builtins, [
        plugin({
          reference: "plugin-conflict",
          id: "conflict",
          tools: {
            read: { description: "duplicate" },
          },
        }),
      ]),
    ).toThrow("tool conflict")
  })
})
