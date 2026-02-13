import type { SerializedError } from "./types"

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message,
    }
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
    }
  }

  return {
    name: "Error",
    message: "Unknown error",
  }
}
