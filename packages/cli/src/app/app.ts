import { createCliRenderer, type CliRenderer, type KeyEvent } from "@opentui/core"
import type { Session, Turn } from "@minicode/sdk"
import type { Minicode } from "@minicode/sdk"
import { createCommandRouter } from "./commands"
import { createTurnQueue } from "./queue"
import { createFooterUi, FOOTER_HEIGHT } from "../ui/footer"
import { createStdoutBridge } from "../ui/stdout"
import { createTurnEventRenderer } from "../ui/event-renderer"
import { formatUnknownError } from "../util/errors"

export type RunCliAppOptions = {
  sdk: Minicode
  session: Session
  footerHeight?: number
}

function formatSessionLabel(session: Pick<Session, "id" | "provider" | "model">): string {
  return `${session.id} (${session.provider}/${session.model})`
}

export async function runCliApp(options: RunCliAppOptions): Promise<void> {
  const queue = createTurnQueue()

  let session = options.session
  let activeTurn: Turn | undefined
  let exitRequested = false

  let rendererRef: CliRenderer | undefined
  let keypressHandler: ((key: KeyEvent) => void) | undefined
  let stdoutBridge = undefined as ReturnType<typeof createStdoutBridge> | undefined
  let footer = undefined as ReturnType<typeof createFooterUi> | undefined

  const renderer = await createCliRenderer({
    useAlternateScreen: false,
    useConsole: false,
    experimental_splitHeight: options.footerHeight ?? FOOTER_HEIGHT,
    onDestroy: () => {
      if (rendererRef && keypressHandler) {
        rendererRef.keyInput.off("keypress", keypressHandler)
      }

      footer?.destroy()
      stdoutBridge?.destroy()
    },
  })
  rendererRef = renderer

  const syncFooterState = () => {
    footer?.setStreaming(Boolean(activeTurn))
    footer?.setSessionLabel(formatSessionLabel(session))
  }

  const requestExit = () => {
    if (exitRequested) {
      return
    }

    exitRequested = true

    if (activeTurn) {
      queue.clearPending()
      activeTurn.abort()
      return
    }

    renderer.destroy()
  }

  const abortActiveTurn = () => {
    if (!activeTurn) {
      return false
    }

    activeTurn.abort()
    return true
  }

  const handlePromptInput = async (prompt: string) => {
    if (!stdoutBridge || !footer) {
      return
    }

    const trimmed = prompt.trim()
    if (!trimmed) {
      return
    }

    if (trimmed.startsWith("/")) {
      await commandRouter.handleSlashInput(trimmed)
      return
    }

    const queueResult = queue.beginOrQueue(trimmed)
    if (queueResult.type === "queued") {
      stdoutBridge.writeln(`[queued] position=${queueResult.position} pending=${queue.pendingCount()}`)
      return
    }

    void runTurnLoop(queueResult.prompt)
  }

  const handlePaletteInput = async (input: string) => {
    if (!footer) {
      return
    }

    const trimmed = input.trim()
    if (!trimmed) {
      footer.closePalette()
      return
    }

    await commandRouter.handlePaletteInput(trimmed)
    footer.closePalette()
  }

  footer = createFooterUi(renderer, {
    onPromptSubmit(prompt) {
      void handlePromptInput(prompt)
    },
    onPaletteSubmit(input) {
      void handlePaletteInput(input)
    },
  })
  renderer.root.add(footer.root)

  stdoutBridge = createStdoutBridge(renderer)

  const commandRouter = createCommandRouter({
    sdk: options.sdk,
    getSession: () => session,
    setSession: (nextSession) => {
      session = nextSession as Session
      syncFooterState()
    },
    print: (text) => {
      stdoutBridge?.write(text)
      syncFooterState()
    },
    isTurnActive: () => Boolean(activeTurn),
    abortActiveTurn,
    requestExit,
  })

  footer.setPaletteActions(commandRouter.actions)

  const runTurnLoop = async (prompt: string) => {
    if (!stdoutBridge) {
      return
    }

    const turnRenderer = createTurnEventRenderer()
    const turn = session.send(prompt)
    activeTurn = turn
    syncFooterState()
    stdoutBridge.write(`\n> ${prompt}\n`)

    try {
      for await (const event of turn.events) {
        const rendered = turnRenderer.render(event)
        if (rendered) {
          stdoutBridge.write(rendered)
        }
      }

      await turn.response
    } catch (error) {
      const fallback = turnRenderer.renderUnknownError(formatUnknownError(error))
      if (fallback) {
        stdoutBridge.write(fallback)
      }
    } finally {
      activeTurn = undefined
      syncFooterState()

      if (exitRequested) {
        queue.clearPending()
        renderer.destroy()
        return
      }

      const nextPrompt = queue.settleActive()
      if (nextPrompt) {
        stdoutBridge.writeln(`[dequeued] pending=${queue.pendingCount()}`)
        void runTurnLoop(nextPrompt)
      }
    }
  }

  keypressHandler = (key) => {
    if (key.ctrl && key.name === "k") {
      key.preventDefault()
      if (footer?.isPaletteOpen()) {
        footer.closePalette()
      } else {
        footer?.openPalette()
      }
      return
    }

    if (key.ctrl && key.name === "c") {
      key.preventDefault()
      if (!abortActiveTurn()) {
        requestExit()
      }
      return
    }

    if (key.name === "escape") {
      key.preventDefault()
      if (footer?.isPaletteOpen()) {
        footer.closePalette()
        return
      }

      if (!activeTurn) {
        requestExit()
      }
    }
  }

  renderer.keyInput.on("keypress", keypressHandler)

  syncFooterState()
  stdoutBridge.writeln(`[session] ${formatSessionLabel(session)}`)
  stdoutBridge.writeln("Type a prompt or /help. Press Ctrl+K for palette.")
  renderer.requestRender()
}
