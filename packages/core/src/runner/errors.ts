import { SerializedErrorSchema, type SerializedError } from "./types"

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return SerializedErrorSchema.parse({
      name: error.name || "Error",
      message: error.message,
    })
  }

  if (typeof error === "string") {
    return SerializedErrorSchema.parse({
      name: "Error",
      message: error,
    })
  }

  return SerializedErrorSchema.parse({
    name: "Error",
    message: "Unknown error",
  })
}
