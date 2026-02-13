import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { FsArtifactStore } from "./artifact-store"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

describe("FsArtifactStore", () => {
  test("writes text and byte artifacts with metadata references", async () => {
    const cwd = await createTempDirectory("minicode-artifacts-")
    const sessionsDir = path.join(cwd, "sessions")

    try {
      const store = new FsArtifactStore({ sessionsDir })

      const textRef = await store.writeText({
        sessionId: "session-a",
        text: "hello artifact",
        label: "read-output",
      })

      expect(textRef.sessionId).toBe("session-a")
      expect(textRef.kind).toBe("text")
      expect(textRef.byteLength).toBe(new TextEncoder().encode("hello artifact").byteLength)

      const textFilePath = path.join(sessionsDir, textRef.relativePath)
      expect(await Bun.file(textFilePath).text()).toBe("hello artifact")

      const bytes = new Uint8Array([1, 2, 3, 4, 5])
      const bytesRef = await store.writeBytes({
        sessionId: "session-a",
        bytes,
        label: "binary-output",
        extension: "bin",
      })

      expect(bytesRef.sessionId).toBe("session-a")
      expect(bytesRef.kind).toBe("bytes")
      expect(bytesRef.byteLength).toBe(bytes.byteLength)

      const bytesFilePath = path.join(sessionsDir, bytesRef.relativePath)
      expect(new Uint8Array(await Bun.file(bytesFilePath).arrayBuffer())).toEqual(bytes)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
