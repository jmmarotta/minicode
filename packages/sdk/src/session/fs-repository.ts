import { mkdir, readdir, rename, rm } from "node:fs/promises"
import path from "node:path"
import { resolveSessionDir, resolveSessionFilePath } from "./paths"
import { SessionStateSchema, type SessionState, type SessionSummary } from "./schema"

export interface SessionRepository {
  exists(id: string): Promise<boolean>
  load(id: string): Promise<SessionState>
  save(state: SessionState): Promise<void>
  create(initial: SessionState): Promise<void>
  list(): Promise<SessionSummary[]>
  delete(id: string): Promise<void>
}

function toSummary(state: SessionState): SessionSummary {
  return {
    id: state.id,
    cwd: state.cwd,
    provider: state.provider,
    model: state.model,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  }
}

function formatValidationError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown validation error"
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT"
  )
}

async function readSessionFile(filePath: string, id: string): Promise<SessionState> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    throw new Error(`Session '${id}' not found`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error(`Session '${id}' contains invalid JSON at '${filePath}'`)
  }

  try {
    return SessionStateSchema.parse(parsed)
  } catch (error) {
    throw new Error(`Session '${id}' failed schema validation: ${formatValidationError(error)}`)
  }
}

async function writeSessionFileAtomic(filePath: string, state: SessionState): Promise<void> {
  const dirPath = path.dirname(filePath)
  await mkdir(dirPath, { recursive: true })

  const tempPath = path.join(dirPath, `.session.${Bun.randomUUIDv7()}.tmp`)
  const text = `${JSON.stringify(state, null, 2)}\n`

  await Bun.write(tempPath, text)

  try {
    await rename(tempPath, filePath)
  } catch (error) {
    await rm(tempPath, { force: true })
    throw error
  }
}

export class FsSessionRepository implements SessionRepository {
  readonly #sessionsDir: string

  constructor(options: { sessionsDir: string }) {
    this.#sessionsDir = path.resolve(options.sessionsDir)
  }

  async exists(id: string): Promise<boolean> {
    return Bun.file(resolveSessionFilePath(this.#sessionsDir, id)).exists()
  }

  async load(id: string): Promise<SessionState> {
    const filePath = resolveSessionFilePath(this.#sessionsDir, id)
    return readSessionFile(filePath, id)
  }

  async save(state: SessionState): Promise<void> {
    const parsed = SessionStateSchema.parse(state)
    const filePath = resolveSessionFilePath(this.#sessionsDir, parsed.id)
    await writeSessionFileAtomic(filePath, parsed)
  }

  async create(initial: SessionState): Promise<void> {
    const parsed = SessionStateSchema.parse(initial)
    if (await this.exists(parsed.id)) {
      throw new Error(`Session '${parsed.id}' already exists`)
    }

    await this.save(parsed)
  }

  async list(): Promise<SessionSummary[]> {
    let entries
    try {
      entries = await readdir(this.#sessionsDir, { withFileTypes: true })
    } catch (error) {
      if (isNotFoundError(error)) {
        return []
      }

      throw error
    }

    const summaries: SessionSummary[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const state = await this.load(entry.name)
      summaries.push(toSummary(state))
    }

    return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async delete(id: string): Promise<void> {
    await rm(resolveSessionDir(this.#sessionsDir, id), { recursive: true, force: true })
  }
}
