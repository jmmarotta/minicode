import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

export function normalizePluginReference(reference: string): string {
  const trimmed = reference.trim()
  if (!trimmed) {
    throw new Error("Plugin reference cannot be empty")
  }

  if (!trimmed.startsWith("file://")) {
    return trimmed
  }

  const fileUrl = new URL(trimmed)
  if (fileUrl.protocol !== "file:") {
    throw new Error(`Unsupported plugin URL protocol: ${fileUrl.protocol}`)
  }

  const filePath = fileURLToPath(fileUrl)
  const normalizedPath = path.normalize(filePath)

  return pathToFileURL(normalizedPath).toString()
}
