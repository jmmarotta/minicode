export type RawCliArgs = {
  session?: string
  newSession: boolean
  provider?: string
  model?: string
  footerHeight?: string
  cwd?: string
  help: boolean
  version: boolean
}

type ParsedFlag = {
  flag: string
  inlineValue?: string
}

const VALUE_FLAGS = new Set(["--session", "--provider", "--model", "--footer-height", "--cwd"])

function parseFlagToken(token: string): ParsedFlag {
  const equalsIndex = token.indexOf("=")
  if (equalsIndex === -1) {
    return {
      flag: token,
    }
  }

  return {
    flag: token.slice(0, equalsIndex),
    inlineValue: token.slice(equalsIndex + 1),
  }
}

function readFlagValue(argv: string[], index: number, flag: string): { value: string; nextIndex: number } {
  const next = argv[index + 1]
  if (!next || next.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`)
  }

  return {
    value: next,
    nextIndex: index + 1,
  }
}

export function parseRawCliArgs(argv: string[]): RawCliArgs {
  const result: RawCliArgs = {
    newSession: false,
    help: false,
    version: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token) {
      continue
    }

    const { flag, inlineValue } = parseFlagToken(token)

    if (!flag.startsWith("-")) {
      throw new Error(`Unexpected positional argument '${token}'`)
    }

    if (inlineValue !== undefined && !VALUE_FLAGS.has(flag)) {
      throw new Error(`Flag '${flag}' does not accept a value`)
    }

    if (flag === "-h" || flag === "--help") {
      result.help = true
      continue
    }

    if (flag === "-v" || flag === "--version") {
      result.version = true
      continue
    }

    if (flag === "--new-session") {
      result.newSession = true
      continue
    }

    const readValue = () => {
      if (inlineValue !== undefined) {
        return {
          value: inlineValue,
          nextIndex: index,
        }
      }

      return readFlagValue(argv, index, flag)
    }

    if (flag === "--session") {
      const parsed = readValue()
      result.session = parsed.value
      index = parsed.nextIndex
      continue
    }

    if (flag === "--provider") {
      const parsed = readValue()
      result.provider = parsed.value
      index = parsed.nextIndex
      continue
    }

    if (flag === "--model") {
      const parsed = readValue()
      result.model = parsed.value
      index = parsed.nextIndex
      continue
    }

    if (flag === "--footer-height") {
      const parsed = readValue()
      result.footerHeight = parsed.value
      index = parsed.nextIndex
      continue
    }

    if (flag === "--cwd") {
      const parsed = readValue()
      result.cwd = parsed.value
      index = parsed.nextIndex
      continue
    }

    throw new Error(`Unknown flag '${flag}'`)
  }

  return result
}
