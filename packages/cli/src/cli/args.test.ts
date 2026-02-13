import { describe, expect, test } from "bun:test"
import { parseRawCliArgs } from "./args"

describe("parseRawCliArgs", () => {
  test("parses supported flags with inline and positional values", () => {
    const parsed = parseRawCliArgs([
      "--session=session-1",
      "--new-session",
      "--provider",
      "openai",
      "--model=gpt-4o-mini",
      "--footer-height",
      "12",
      "--cwd",
      "./workspace",
      "-h",
      "-v",
    ])

    expect(parsed).toEqual({
      session: "session-1",
      newSession: true,
      provider: "openai",
      model: "gpt-4o-mini",
      footerHeight: "12",
      cwd: "./workspace",
      help: true,
      version: true,
    })
  })

  test("throws on missing required flag value", () => {
    expect(() => parseRawCliArgs(["--model"])).toThrowError("Missing value for --model")
  })

  test("throws on unknown flags", () => {
    expect(() => parseRawCliArgs(["--unknown"])).toThrowError("Unknown flag '--unknown'")
  })

  test("throws on unexpected positional arguments", () => {
    expect(() => parseRawCliArgs(["prompt text"])).toThrowError("Unexpected positional argument 'prompt text'")
  })
})
