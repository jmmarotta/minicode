import path from "node:path"
import { ZodError } from "zod"
import { createMinicode, type OpenSessionOptions, type RuntimeOverride } from "@minicode/sdk"
import { runCliApp } from "../app/app"
import { formatUnknownError } from "../util/errors"
import { parseRawCliArgs } from "./args"
import { parseCliArgs } from "./schema"

const HELP_TEXT = [
  "Usage: minicode [options]",
  "",
  "Options:",
  "  --session <id>        Resume a session by id",
  "  --new-session         Create session when --session id is missing",
  "  --provider <id>       Runtime provider override for new sessions",
  "  --model <id>          Runtime model override",
  "  --footer-height <n>   Footer split height in rows (default: 10)",
  "  --cwd <path>          Working directory override",
  "  -h, --help            Show help",
  "  -v, --version         Show version",
].join("\n")

type PackageManifest = {
  version?: string
}

type StartCliDependencies = {
  createMinicode: typeof createMinicode
  runCliApp: typeof runCliApp
  writeStdout: (value: string) => void
  readCliVersion: () => Promise<string>
}

function toOpenSessionOptions(input: {
  session?: string
  newSession: boolean
  provider?: RuntimeOverride["provider"]
  model?: string
}): OpenSessionOptions | undefined {
  const options: OpenSessionOptions = {}

  if (input.session) {
    options.id = input.session
    options.createIfMissing = input.newSession
  }

  if (input.provider || input.model) {
    options.runtime = {
      provider: input.provider,
      model: input.model,
    }
  }

  return Object.keys(options).length > 0 ? options : undefined
}

async function readCliVersion(): Promise<string> {
  const manifestFile = Bun.file(new URL("../../package.json", import.meta.url))
  const manifest = (await manifestFile.json()) as PackageManifest
  return manifest.version ?? "0.0.0"
}

const defaultDependencies: StartCliDependencies = {
  createMinicode,
  runCliApp,
  writeStdout(value: string) {
    process.stdout.write(value)
  },
  readCliVersion,
}

export async function startCli(
  argv: string[],
  dependencies: StartCliDependencies = defaultDependencies,
): Promise<void> {
  const raw = parseRawCliArgs(argv)

  let args: ReturnType<typeof parseCliArgs>
  try {
    args = parseCliArgs(raw)
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => issue.message).join("; ")
      throw new Error(`Invalid CLI arguments: ${details}`)
    }

    throw error
  }

  if (args.help) {
    dependencies.writeStdout(`${HELP_TEXT}\n`)
    return
  }

  if (args.version) {
    dependencies.writeStdout(`${await dependencies.readCliVersion()}\n`)
    return
  }

  const cwd = path.resolve(args.cwd ?? process.cwd())
  const sdk = await dependencies.createMinicode({ cwd })

  const session = await sdk.openSession(
    toOpenSessionOptions({
      session: args.session,
      newSession: args.newSession,
      provider: args.provider,
      model: args.model,
    }),
  )

  try {
    await dependencies.runCliApp({
      sdk,
      session,
      footerHeight: args.footerHeight,
    })
  } catch (error) {
    throw new Error(`CLI startup failed: ${formatUnknownError(error)}`)
  }
}
