import { z } from "zod"
import * as path from "path"
import { Tool } from "./tool"
import DESCRIPTION from "./description/read.txt"

const DEFAULT_READ_LIMIT = 2000
const MAX_LINE_LENGTH = 2000

function isImageFile(filePath: string): string | false {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "JPEG"
    case ".png":
      return "PNG"
    case ".gif":
      return "GIF"
    case ".bmp":
      return "BMP"
    case ".webp":
      return "WebP"
    default:
      return false
  }
}

async function isBinaryFile(filepath: string, file: Bun.BunFile): Promise<boolean> {
  const ext = path.extname(filepath).toLowerCase()
  // binary check for common non-text extensions
  switch (ext) {
    case ".zip":
    case ".tar":
    case ".gz":
    case ".exe":
    case ".dll":
    case ".so":
    case ".class":
    case ".jar":
    case ".war":
    case ".7z":
    case ".doc":
    case ".docx":
    case ".xls":
    case ".xlsx":
    case ".ppt":
    case ".pptx":
    case ".odt":
    case ".ods":
    case ".odp":
    case ".bin":
    case ".dat":
    case ".obj":
    case ".o":
    case ".a":
    case ".lib":
    case ".wasm":
    case ".pyc":
    case ".pyo":
      return true
    default:
      break
  }

  const stat = await file.stat()
  const fileSize = stat.size
  if (fileSize === 0) return false

  const bufferSize = Math.min(4096, fileSize)
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength === 0) return false
  const bytes = new Uint8Array(buffer.slice(0, bufferSize))

  let nonPrintableCount = 0
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined) continue
    if (byte === 0) return true
    if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintableCount++
    }
  }
  // If >30% non-printable characters, consider it binary
  return nonPrintableCount / bytes.length > 0.3
}

const tool = Tool.define("read", {
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z.string().describe("The path to the file to read"),
    offset: z.coerce.number().describe("The line number to start reading from (0-based)").optional(),
    limit: z.coerce.number().describe("The number of lines to read (defaults to 2000)").optional(),
  }),
  async execute(args, _ctx) {
    const { filePath, offset = 0, limit = DEFAULT_READ_LIMIT } = args

    // Ensure absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

    // Check if file exists
    const file = Bun.file(absolutePath)
    const exists = await file.exists()

    if (!exists) {
      throw new Error(`File not found: ${absolutePath}`)
    }

    // Check if it's an image file
    const imageType = isImageFile(absolutePath)
    if (imageType) {
      throw new Error(`Cannot read image file (${imageType}): ${absolutePath}`)
    }

    // Check if it's a binary file
    if (await isBinaryFile(absolutePath, file)) {
      throw new Error(`Cannot read binary file: ${absolutePath}`)
    }

    // Read the file content
    const content = await file.text()
    const lines = content.split("\n")

    // Apply offset and limit
    const selectedLines = lines.slice(offset, offset + limit)

    // Format output with line numbers (1-indexed like cat -n)
    const formattedLines = selectedLines.map((line, index) => {
      const lineNumber = offset + index + 1
      const truncatedLine = line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + "...[truncated]" : line
      // Format: spaces + line number + tab + content (matching cat -n format)
      return `${lineNumber.toString().padStart(6)}→${truncatedLine}`
    })

    const output = formattedLines.join("\n")

    // Create preview (first few lines for metadata)
    const previewLines = selectedLines
      .slice(0, 5)
      .map((line) => (line.length > 80 ? line.substring(0, 80) + "..." : line))
    const preview = previewLines.join("\n")

    // Get relative path for title (fallback to absolute if cwd not available)
    const title = process.cwd() ? path.relative(process.cwd(), absolutePath) : absolutePath

    return {
      title,
      output,
      metadata: {
        preview,
      },
    }
  },
})

export const Read = {
  tool,
}
