import type { CliRenderer } from "@opentui/core"

type StdoutBridgeOptions = {
  debounceMs?: number
  writeToStdout?: boolean
  onWrite?: (text: string) => void
}

export type StdoutBridge = {
  write: (text: string) => void
  writeln: (line: string) => void
  destroy: () => void
}

export function createStdoutBridge(renderer: CliRenderer, options: StdoutBridgeOptions = {}): StdoutBridge {
  const debounceMs = options.debounceMs ?? 16
  const writeToStdout = options.writeToStdout ?? true

  let scheduledRender: ReturnType<typeof setTimeout> | undefined

  const requestFooterRender = () => {
    if (scheduledRender) {
      return
    }

    scheduledRender = setTimeout(() => {
      scheduledRender = undefined
      renderer.requestRender()
    }, debounceMs)
  }

  const write = (text: string) => {
    if (writeToStdout) {
      process.stdout.write(text)
    }
    options.onWrite?.(text)
    requestFooterRender()
  }

  const writeln = (line: string) => {
    write(`${line}\n`)
  }

  const destroy = () => {
    if (!scheduledRender) {
      return
    }

    clearTimeout(scheduledRender)
    scheduledRender = undefined
  }

  return {
    write,
    writeln,
    destroy,
  }
}
