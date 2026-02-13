import path from "node:path"

export const SESSION_FILE_NAME = "session.json"
export const SESSION_ARTIFACTS_DIR_NAME = "artifacts"

export function normalizeSessionsDir(sessionsDir: string): string {
  return path.resolve(sessionsDir)
}

export function resolveSessionDir(sessionsDir: string, sessionId: string): string {
  return path.join(normalizeSessionsDir(sessionsDir), sessionId)
}

export function resolveSessionFilePath(sessionsDir: string, sessionId: string): string {
  return path.join(resolveSessionDir(sessionsDir, sessionId), SESSION_FILE_NAME)
}

export function resolveSessionArtifactsDir(sessionsDir: string, sessionId: string): string {
  return path.join(resolveSessionDir(sessionsDir, sessionId), SESSION_ARTIFACTS_DIR_NAME)
}

export function resolveSessionArtifactFilePath(sessionsDir: string, sessionId: string, fileName: string): string {
  return path.join(resolveSessionArtifactsDir(sessionsDir, sessionId), fileName)
}
