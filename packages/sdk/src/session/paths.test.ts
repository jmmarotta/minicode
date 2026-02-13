import { describe, expect, test } from "bun:test"
import path from "node:path"
import {
  SESSION_ARTIFACTS_DIR_NAME,
  SESSION_FILE_NAME,
  normalizeSessionsDir,
  resolveSessionArtifactFilePath,
  resolveSessionArtifactsDir,
  resolveSessionDir,
  resolveSessionFilePath,
} from "./paths"

describe("session path helpers", () => {
  test("normalizes sessions dir to an absolute path", () => {
    expect(normalizeSessionsDir("./sessions")).toBe(path.resolve("./sessions"))
  })

  test("resolves stable session directory and file layout", () => {
    const sessionsDir = path.resolve("./sessions")
    const sessionId = "session-123"

    expect(resolveSessionDir(sessionsDir, sessionId)).toBe(path.join(sessionsDir, sessionId))
    expect(resolveSessionFilePath(sessionsDir, sessionId)).toBe(path.join(sessionsDir, sessionId, SESSION_FILE_NAME))
    expect(resolveSessionArtifactsDir(sessionsDir, sessionId)).toBe(
      path.join(sessionsDir, sessionId, SESSION_ARTIFACTS_DIR_NAME),
    )
    expect(resolveSessionArtifactFilePath(sessionsDir, sessionId, "artifact.txt")).toBe(
      path.join(sessionsDir, sessionId, SESSION_ARTIFACTS_DIR_NAME, "artifact.txt"),
    )
  })
})
