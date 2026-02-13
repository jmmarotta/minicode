import { z } from "zod"
import type { Minicode, ProviderId } from "@minicode/sdk"
import { formatUnknownError } from "../util/errors"

const ProviderIdSchema = z.enum(["openai", "anthropic", "google", "openai-compatible"])
const ModelIdSchema = z.string().trim().min(1)
const SessionIdSchema = z.string().trim().min(1)

const NewSessionArgsSchema = z.object({
  provider: ProviderIdSchema.optional(),
  model: ModelIdSchema.optional(),
})

const TOKEN_PATTERN = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g

type SessionHandle = {
  id: string
  provider: ProviderId
  model: string
}

type CommandAction = {
  id: string
  title: string
  description: string
  usage: string
  allowDuringTurn: boolean
  aliases: string[]
  run: (context: { runtime: CommandRuntime; args: string[] }) => Promise<void>
}

export type CommandPaletteAction = {
  id: string
  title: string
  description: string
  usage: string
  allowDuringTurn: boolean
}

export type CommandRuntime = {
  sdk: Pick<Minicode, "getRuntimeCatalog" | "listSessions" | "openSession">
  getSession: () => SessionHandle
  setSession: (session: SessionHandle) => void
  print: (text: string) => void
  isTurnActive: () => boolean
  abortActiveTurn: () => boolean
  requestExit: () => void
}

export type CommandRouter = {
  actions: CommandPaletteAction[]
  handleSlashInput: (input: string) => Promise<boolean>
  handlePaletteInput: (input: string) => Promise<boolean>
}

function unquoteToken(token: string): string {
  const startsWithDouble = token.startsWith('"')
  const endsWithDouble = token.endsWith('"')
  const startsWithSingle = token.startsWith("'")
  const endsWithSingle = token.endsWith("'")

  if ((startsWithDouble && endsWithDouble) || (startsWithSingle && endsWithSingle)) {
    return token.slice(1, -1)
  }

  return token
}

function tokenize(input: string): string[] {
  const matches = input.match(TOKEN_PATTERN)
  if (!matches) {
    return []
  }

  return matches.map((item) => unquoteToken(item))
}

function parseCommandInput(
  input: string,
  options: {
    allowBare: boolean
  },
): { id: string; args: string[] } | undefined {
  const trimmed = input.trim()
  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith("/")) {
    const tokens = tokenize(trimmed.slice(1))
    if (tokens.length === 0) {
      return {
        id: "help",
        args: [],
      }
    }

    const [id, ...args] = tokens
    if (!id) {
      return {
        id: "help",
        args: [],
      }
    }

    return {
      id: id.toLowerCase(),
      args,
    }
  }

  if (!options.allowBare) {
    return undefined
  }

  const tokens = tokenize(trimmed)
  if (tokens.length === 0) {
    return undefined
  }

  const [id, ...args] = tokens
  if (!id) {
    return undefined
  }

  return {
    id: id.toLowerCase(),
    args,
  }
}

function renderHelp(actions: CommandAction[]): string {
  const lines = actions.map((action) => `  /${action.usage.padEnd(28)} ${action.description}`)
  return `[help]\n${lines.join("\n")}\n`
}

function parseNewSessionArgs(tokens: string[]): z.infer<typeof NewSessionArgsSchema> {
  const raw: {
    provider?: string
    model?: string
  } = {}

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token === "--provider") {
      const value = tokens[index + 1]
      if (!value) {
        throw new Error("Missing value for --provider")
      }
      raw.provider = value
      index += 1
      continue
    }

    if (token === "--model") {
      const value = tokens[index + 1]
      if (!value) {
        throw new Error("Missing value for --model")
      }
      raw.model = value
      index += 1
      continue
    }

    throw new Error(`Unknown option for /new: ${token}`)
  }

  return NewSessionArgsSchema.parse(raw)
}

function getProviderModels(runtime: CommandRuntime, provider: ProviderId): string[] {
  const providerEntry = runtime.sdk.getRuntimeCatalog().providers.find((entry) => entry.id === provider)
  return providerEntry?.models ?? []
}

function assertModelExists(runtime: CommandRuntime, provider: ProviderId, model: string) {
  const allowedModels = getProviderModels(runtime, provider)
  if (allowedModels.length === 0) {
    return
  }

  if (allowedModels.includes(model)) {
    return
  }

  throw new Error(`Model '${model}' is not configured for provider '${provider}'`)
}

function formatSessionLine(session: SessionHandle, prefix = "[session]"): string {
  return `${prefix} ${session.id} (${session.provider}/${session.model})\n`
}

function formatSessionSummary(summary: Awaited<ReturnType<Minicode["listSessions"]>>[number]): string {
  return `- ${summary.id} ${summary.provider}/${summary.model} updated=${new Date(summary.updatedAt).toISOString()}`
}

function createBuiltInActions(runtime: CommandRuntime): CommandAction[] {
  const actions: CommandAction[] = [
    {
      id: "new",
      title: "New session",
      description: "Create a new session with optional provider/model override",
      usage: "new [--provider <id>] [--model <id>]",
      allowDuringTurn: false,
      aliases: ["n"],
      async run({ args }) {
        const parsed = parseNewSessionArgs(args)
        const current = runtime.getSession()
        const provider = parsed.provider ?? (parsed.model ? current.provider : undefined)

        if (provider && parsed.model) {
          assertModelExists(runtime, provider, parsed.model)
        }

        const runtimeOverride = provider || parsed.model ? { provider, model: parsed.model } : undefined
        const nextSession = await runtime.sdk.openSession({
          runtime: runtimeOverride,
        })

        runtime.setSession(nextSession)
        runtime.print(formatSessionLine(nextSession, "[session:new]"))
      },
    },
    {
      id: "sessions",
      title: "Switch session",
      description: "List available sessions",
      usage: "sessions",
      allowDuringTurn: true,
      aliases: ["ls"],
      async run() {
        const sessions = await runtime.sdk.listSessions()
        if (sessions.length === 0) {
          runtime.print("[sessions] none\n")
          return
        }

        runtime.print(`[sessions]\n${sessions.map((session) => formatSessionSummary(session)).join("\n")}\n`)
      },
    },
    {
      id: "use",
      title: "Use session",
      description: "Switch to an existing session by id",
      usage: "use <id>",
      allowDuringTurn: false,
      aliases: ["session"],
      async run({ args }) {
        const id = SessionIdSchema.parse(args.join(" "))
        const nextSession = await runtime.sdk.openSession({
          id,
          createIfMissing: false,
        })

        runtime.setSession(nextSession)
        runtime.print(formatSessionLine(nextSession, "[session:switched]"))
      },
    },
    {
      id: "model",
      title: "Switch model",
      description: "Switch model for the active session provider",
      usage: "model <id>",
      allowDuringTurn: false,
      aliases: ["m"],
      async run({ args }) {
        const model = ModelIdSchema.parse(args.join(" "))
        const current = runtime.getSession()

        assertModelExists(runtime, current.provider, model)

        const nextSession = await runtime.sdk.openSession({
          id: current.id,
          runtime: {
            model,
          },
        })

        runtime.setSession(nextSession)
        runtime.print(`[runtime] ${nextSession.provider}/${nextSession.model}\n`)
      },
    },
    {
      id: "abort",
      title: "Abort active turn",
      description: "Abort the currently streaming turn",
      usage: "abort",
      allowDuringTurn: true,
      aliases: [],
      async run() {
        const didAbort = runtime.abortActiveTurn()
        runtime.print(didAbort ? "[abort] requested\n" : "[abort] no active turn\n")
      },
    },
    {
      id: "help",
      title: "Help",
      description: "Show slash commands",
      usage: "help",
      allowDuringTurn: true,
      aliases: ["?"],
      async run() {
        runtime.print(renderHelp(actions))
      },
    },
    {
      id: "exit",
      title: "Exit",
      description: "Exit the application",
      usage: "exit",
      allowDuringTurn: true,
      aliases: ["quit", "q"],
      async run() {
        runtime.requestExit()
      },
    },
  ]

  return actions
}

function createActionLookup(actions: CommandAction[]): Map<string, CommandAction> {
  const lookup = new Map<string, CommandAction>()

  for (const action of actions) {
    const ids = [action.id, ...action.aliases]
    for (const id of ids) {
      if (lookup.has(id)) {
        throw new Error(`Duplicate command id or alias '${id}'`)
      }
      lookup.set(id, action)
    }
  }

  return lookup
}

export function createCommandRouter(runtime: CommandRuntime): CommandRouter {
  const actions = createBuiltInActions(runtime)
  const actionLookup = createActionLookup(actions)

  const execute = async (input: string, options: { allowBare: boolean }): Promise<boolean> => {
    const parsed = parseCommandInput(input, options)
    if (!parsed) {
      return false
    }

    const action = actionLookup.get(parsed.id)
    if (!action) {
      runtime.print(`[error] Unknown command '${parsed.id}'. Run /help.\n`)
      return true
    }

    if (runtime.isTurnActive() && !action.allowDuringTurn) {
      runtime.print(`[busy] '/${action.id}' requires idle state\n`)
      return true
    }

    try {
      await action.run({
        runtime,
        args: parsed.args,
      })
    } catch (error) {
      runtime.print(`[error] ${formatUnknownError(error)}\n`)
    }

    return true
  }

  return {
    actions: actions.map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      usage: action.usage,
      allowDuringTurn: action.allowDuringTurn,
    })),

    handleSlashInput(input) {
      return execute(input, {
        allowBare: false,
      })
    },

    handlePaletteInput(input) {
      return execute(input, {
        allowBare: true,
      })
    },
  }
}
