import path from "node:path"

export function resolveFilePath(cwd: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath)
  }

  return path.normalize(path.join(cwd, filePath))
}

export function truncateByBytes(text: string, maxBytes: number): { text: string; truncated: boolean } {
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

  return {
    text: `${text.slice(0, best)}\n...[truncated]`,
    truncated: true,
  }
}
