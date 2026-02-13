import { describe, expect, test } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { normalizePluginReference } from "./normalize"

describe("normalizePluginReference", () => {
  test("returns package references unchanged (trimmed)", () => {
    expect(normalizePluginReference("  @scope/plugin  ")).toBe("@scope/plugin")
  })

  test("normalizes file URL references deterministically", () => {
    const fileUrl = pathToFileURL(path.join(process.cwd(), "plugins", "..", "plugins", "my-plugin.mjs")).toString()
    const normalized = normalizePluginReference(fileUrl)
    expect(normalized).toBe(pathToFileURL(path.join(process.cwd(), "plugins", "my-plugin.mjs")).toString())
  })

  test("rejects empty references", () => {
    expect(() => normalizePluginReference("   ")).toThrow("Plugin reference cannot be empty")
  })
})
