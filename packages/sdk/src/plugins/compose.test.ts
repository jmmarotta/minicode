import { describe, expect, test } from "bun:test"
import type { ToolSet } from "ai"
import { composeSdkContributions } from "./compose"
import type { LoadedPlugin } from "./types"

function plugin(input: {
  reference: string
  id: string
  tools?: Record<string, unknown>
  instructionFragments?: string[]
  actions?: Array<{
    id: string
    title: string
    aliases?: string[]
  }>
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
      cli: {
        actions: input.actions?.map((action) => ({
          id: action.id,
          title: action.title,
          aliases: action.aliases,
          run() {},
        })),
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

  test("preserves plugin action registration order", () => {
    const builtins = {} as ToolSet

    const composed = composeSdkContributions(builtins, [
      plugin({
        reference: "plugin-a",
        id: "a",
        actions: [
          { id: "alpha", title: "Alpha" },
          { id: "beta", title: "Beta" },
        ],
      }),
      plugin({
        reference: "plugin-b",
        id: "b",
        actions: [{ id: "gamma", title: "Gamma" }],
      }),
    ])

    expect(composed.cliActions.map((action) => action.id)).toEqual(["alpha", "beta", "gamma"])
    expect(composed.cliActions.map((action) => action.sourcePluginId)).toEqual(["a", "a", "b"])
  })

  test("rejects duplicate plugin action ids", () => {
    const builtins = {} as ToolSet

    expect(() =>
      composeSdkContributions(builtins, [
        plugin({
          reference: "plugin-a",
          id: "a",
          actions: [{ id: "inspect", title: "Inspect" }],
        }),
        plugin({
          reference: "plugin-b",
          id: "b",
          actions: [{ id: "inspect", title: "Inspect again" }],
        }),
      ]),
    ).toThrow("action conflict")
  })

  test("rejects plugin action alias conflicts", () => {
    const builtins = {} as ToolSet

    expect(() =>
      composeSdkContributions(builtins, [
        plugin({
          reference: "plugin-a",
          id: "a",
          actions: [{ id: "inspect", title: "Inspect" }],
        }),
        plugin({
          reference: "plugin-b",
          id: "b",
          actions: [{ id: "status", title: "Status", aliases: ["inspect"] }],
        }),
      ]),
    ).toThrow("action conflict")
  })
})
