import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { FsSessionRepository } from "./fs-repository"
import { resolveSessionFilePath } from "./paths"
import { SessionStateSchema } from "./schema"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

describe("FsSessionRepository", () => {
  test("supports create/load/save/list/delete lifecycle", async () => {
    const cwd = await createTempDirectory("minicode-session-repo-")
    const sessionsDir = path.join(cwd, "sessions")
    const repository = new FsSessionRepository({ sessionsDir })

    try {
      const first = SessionStateSchema.parse({
        version: 1,
        id: "session-a",
        cwd,
        createdAt: 1,
        updatedAt: 10,
        provider: "anthropic",
        model: "claude-3-5-sonnet-latest",
        messages: [{ role: "user", content: "hello" }],
      })

      const second = SessionStateSchema.parse({
        version: 1,
        id: "session-b",
        cwd,
        createdAt: 2,
        updatedAt: 20,
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "world" }],
      })

      await repository.create(first)
      await repository.create(second)

      expect(await repository.exists("session-a")).toBe(true)
      expect(await repository.exists("session-b")).toBe(true)

      const loadedFirst = await repository.load("session-a")
      expect(loadedFirst.id).toBe("session-a")
      expect(loadedFirst.messages.length).toBe(1)

      const listed = await repository.list()
      expect(listed.map((item) => item.id)).toEqual(["session-b", "session-a"])

      await repository.save({
        ...loadedFirst,
        updatedAt: 30,
        model: "claude-3-7-sonnet-latest",
      })

      const relisted = await repository.list()
      expect(relisted.map((item) => item.id)).toEqual(["session-a", "session-b"])

      await repository.delete("session-a")
      expect(await repository.exists("session-a")).toBe(false)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("fails explicitly for invalid JSON and schema-invalid files", async () => {
    const cwd = await createTempDirectory("minicode-session-corrupt-")
    const sessionsDir = path.join(cwd, "sessions")
    const repository = new FsSessionRepository({ sessionsDir })

    try {
      const corruptId = "corrupt-session"
      const corruptPath = resolveSessionFilePath(sessionsDir, corruptId)
      await mkdir(path.dirname(corruptPath), { recursive: true })

      await Bun.write(corruptPath, "{not-json")

      let invalidJsonError: unknown
      try {
        await repository.load(corruptId)
      } catch (error) {
        invalidJsonError = error
      }

      expect(invalidJsonError).toBeInstanceOf(Error)
      expect((invalidJsonError as Error).message).toContain("invalid JSON")

      await Bun.write(corruptPath, JSON.stringify({ id: corruptId }))

      let invalidSchemaError: unknown
      try {
        await repository.load(corruptId)
      } catch (error) {
        invalidSchemaError = error
      }

      expect(invalidSchemaError).toBeInstanceOf(Error)
      expect((invalidSchemaError as Error).message).toContain("schema validation")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
