import { create } from "../util/logger"

const log = create({ service: "file.time" })

const state: {
  read: {
    [sessionID: string]: {
      [path: string]: Date | undefined
    }
  }
} = {
  read: {},
}

export function read(sessionID: string, filePath: string) {
  log.info("read", { sessionID, filePath })
  state.read[sessionID] = state.read[sessionID] || {}
  state.read[sessionID][filePath] = new Date()
}

export function get(sessionID: string, filePath: string) {
  return state.read[sessionID]?.[filePath]
}

export async function assert(sessionID: string, filePath: string) {
  const time = get(sessionID, filePath)
  if (!time) throw new Error(`You must read the file ${filePath} before overwriting it. Use the Read tool first`)
  const stats = await Bun.file(filePath).stat()
  if (stats.mtime.getTime() > time.getTime()) {
    throw new Error(
      `File ${filePath} has been modified since it was last read.\nLast modification: ${stats.mtime.toISOString()}\nLast read: ${time.toISOString()}\n\nPlease read the file again before modifying it.`,
    )
  }
}

export const FileTime = {
  read,
  get,
  assert,
}
