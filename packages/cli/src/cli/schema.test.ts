import { describe, expect, test } from "bun:test"
import { parseCliArgs } from "./schema"

describe("parseCliArgs", () => {
  test("applies defaults for optional values", () => {
    const parsed = parseCliArgs({
      newSession: false,
      help: false,
      version: false,
    })

    expect(parsed.footerHeight).toBe(10)
    expect(parsed.newSession).toBe(false)
    expect(parsed.help).toBe(false)
    expect(parsed.version).toBe(false)
  })

  test("rejects provider override on existing session without --new-session", () => {
    expect(() =>
      parseCliArgs({
        session: "resume-id",
        provider: "openai",
        newSession: false,
        help: false,
        version: false,
      }),
    ).toThrowError("--provider can only be used with new sessions")
  })

  test("accepts provider override when creating a new session", () => {
    const parsed = parseCliArgs({
      session: "new-id",
      provider: "openai",
      model: "gpt-4o-mini",
      newSession: true,
      help: false,
      version: false,
    })

    expect(parsed.provider).toBe("openai")
    expect(parsed.model).toBe("gpt-4o-mini")
    expect(parsed.newSession).toBe(true)
  })

  test("rejects footer height outside supported range", () => {
    expect(() =>
      parseCliArgs({
        newSession: false,
        footerHeight: "2",
        help: false,
        version: false,
      }),
    ).toThrowError("Too small")
  })
})
