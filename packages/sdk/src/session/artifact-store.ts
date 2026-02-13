import { mkdir } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"
import { normalizeSessionsDir, resolveSessionArtifactFilePath } from "./paths"

export const ArtifactKindSchema = z.enum(["text", "bytes"])

export const ArtifactReferenceSchema = z.strictObject({
  id: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  kind: ArtifactKindSchema,
  relativePath: z.string().trim().min(1),
  byteLength: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
})

export type ArtifactReference = z.output<typeof ArtifactReferenceSchema>

export interface ArtifactStore {
  writeText(input: { sessionId: string; text: string; label?: string; extension?: string }): Promise<ArtifactReference>
  writeBytes(input: {
    sessionId: string
    bytes: Uint8Array
    label?: string
    extension?: string
  }): Promise<ArtifactReference>
}

function sanitizeFileComponent(input?: string): string | undefined {
  if (!input) return undefined
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
  return cleaned ? cleaned.replace(/^-+|-+$/g, "") : undefined
}

function normalizeExtension(extension?: string): string {
  if (!extension) return ""
  const cleaned = sanitizeFileComponent(extension.replace(/^\./, ""))
  return cleaned ? `.${cleaned}` : ""
}

export class FsArtifactStore implements ArtifactStore {
  readonly #sessionsDir: string

  constructor(options: { sessionsDir: string }) {
    this.#sessionsDir = normalizeSessionsDir(options.sessionsDir)
  }

  async writeText(input: {
    sessionId: string
    text: string
    label?: string
    extension?: string
  }): Promise<ArtifactReference> {
    const bytes = new TextEncoder().encode(input.text)
    return this.writeArtifact({
      kind: "text",
      sessionId: input.sessionId,
      bytes,
      label: input.label,
      extension: input.extension ?? "txt",
    })
  }

  async writeBytes(input: {
    sessionId: string
    bytes: Uint8Array
    label?: string
    extension?: string
  }): Promise<ArtifactReference> {
    return this.writeArtifact({
      kind: "bytes",
      sessionId: input.sessionId,
      bytes: input.bytes,
      label: input.label,
      extension: input.extension,
    })
  }

  private async writeArtifact(input: {
    kind: ArtifactReference["kind"]
    sessionId: string
    bytes: Uint8Array
    label?: string
    extension?: string
  }): Promise<ArtifactReference> {
    const id = Bun.randomUUIDv7()
    const sessionId = input.sessionId.trim()
    const safeLabel = sanitizeFileComponent(input.label)
    const extension = normalizeExtension(input.extension)
    const fileName = `${safeLabel ? `${safeLabel}-` : ""}${id}${extension}`

    const absolutePath = resolveSessionArtifactFilePath(this.#sessionsDir, sessionId, fileName)
    const relativePath = path.join(sessionId, "artifacts", fileName)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await Bun.write(absolutePath, input.bytes)

    return ArtifactReferenceSchema.parse({
      id,
      sessionId,
      kind: input.kind,
      relativePath,
      byteLength: input.bytes.byteLength,
      createdAt: Date.now(),
    })
  }
}
