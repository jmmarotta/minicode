import path from "node:path"
import type { ToolCallOptions } from "ai"
import type { ArtifactReference, ArtifactStore } from "../session/artifact-store"

export function resolveFilePath(cwd: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath)
  }

  return path.normalize(path.join(cwd, filePath))
}

type TruncateByBytesOptions = {
  artifactStore?: ArtifactStore
  callOptions?: ToolCallOptions
  artifactLabel?: string
}

type TruncateByBytesResult = {
  text: string
  truncated: boolean
  artifact?: ArtifactReference
  artifactError?: string
}

function getSessionIdFromToolContext(callOptions?: ToolCallOptions): string | undefined {
  const context = callOptions?.experimental_context
  if (typeof context !== "object" || context === null) {
    return undefined
  }

  const sessionId = (context as { sessionId?: unknown }).sessionId
  if (typeof sessionId !== "string") {
    return undefined
  }

  const trimmed = sessionId.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function truncateByBytes(
  text: string,
  maxBytes: number,
  options: TruncateByBytesOptions = {},
): Promise<TruncateByBytesResult> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)

  if (bytes.byteLength <= maxBytes) {
    return {
      text,
      truncated: false,
    }
  }

  let low = 0
  let high = text.length
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = text.slice(0, mid)
    const size = encoder.encode(candidate).byteLength

    if (size <= maxBytes) {
      best = mid
      low = mid + 1
      continue
    }

    high = mid - 1
  }

  let artifact: ArtifactReference | undefined
  let artifactError: string | undefined

  const sessionId = getSessionIdFromToolContext(options.callOptions)
  if (options.artifactStore && sessionId) {
    try {
      artifact = await options.artifactStore.writeText({
        sessionId,
        text,
        label: options.artifactLabel,
      })
    } catch (error) {
      artifactError = error instanceof Error ? error.message : "artifact write failed"
    }
  }

  const artifactMessage = artifact ? `\n[full output stored as artifact ${artifact.id}]` : ""

  return {
    text: `${text.slice(0, best)}\n...[truncated]${artifactMessage}`,
    truncated: true,
    artifact,
    artifactError,
  }
}
