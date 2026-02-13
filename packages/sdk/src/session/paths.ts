import path from "node:path"

export const SESSION_FILE_NAME = "session.json"

export function normalizeSessionsDir(sessionsDir: string): string {
  return path.resolve(sessionsDir)
}

export function resolveSessionDir(sessionsDir: string, sessionId: string): string {
  return path.join(normalizeSessionsDir(sessionsDir), sessionId)
}

export function resolveSessionFilePath(sessionsDir: string, sessionId: string): string {
  return path.join(resolveSessionDir(sessionsDir, sessionId), SESSION_FILE_NAME)
}
