import { describe, expect, test } from "bun:test"
import { serializeError } from "./errors"
import { SerializedErrorSchema } from "./types"

describe("serializeError", () => {
  test("serializes Error instances", () => {
    const serialized = serializeError(new Error("boom"))

    expect(serialized).toEqual({
      name: "Error",
      message: "boom",
    })
    expect(SerializedErrorSchema.parse(serialized)).toEqual(serialized)
  })

  test("serializes string errors", () => {
    const serialized = serializeError("broken")

    expect(serialized).toEqual({
      name: "Error",
      message: "broken",
    })
    expect(SerializedErrorSchema.parse(serialized)).toEqual(serialized)
  })

  test("serializes unknown values", () => {
    const serialized = serializeError({ code: 500 })

    expect(serialized).toEqual({
      name: "Error",
      message: "Unknown error",
    })
    expect(SerializedErrorSchema.parse(serialized)).toEqual(serialized)
  })
})
