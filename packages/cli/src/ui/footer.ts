import { BoxRenderable, TextRenderable, TextareaRenderable, type CliRenderer } from "@opentui/core"
import { createPaletteUi, type PaletteAction } from "./palette"

export const FOOTER_HEIGHT = 10

type CreateFooterOptions = {
  onPromptSubmit: (prompt: string) => void
  onPaletteSubmit: (command: string) => void
}

export type FooterUi = {
  root: BoxRenderable
  focusPrompt: () => void
  openPalette: () => void
  closePalette: () => void
  isPaletteOpen: () => boolean
  setPaletteActions: (actions: PaletteAction[]) => void
  setStreaming: (streaming: boolean) => void
  setSessionLabel: (label: string) => void
  destroy: () => void
}

export function createFooterUi(renderer: CliRenderer, options: CreateFooterOptions): FooterUi {
  const root = new BoxRenderable(renderer, {
    id: "footer",
    width: "100%",
    height: "100%",
    border: true,
    borderStyle: "rounded",
    borderColor: "#1d4ed8",
    padding: 1,
    flexDirection: "column",
    backgroundColor: "#020617",
  })

  const statusText = new TextRenderable(renderer, {
    id: "footer-status",
    content: "",
    fg: "#93c5fd",
  })

  const promptInput = new TextareaRenderable(renderer, {
    id: "footer-prompt",
    width: "100%",
    flexGrow: 1,
    placeholder: "Type your prompt...",
    keyBindings: [
      { name: "return", ctrl: true, action: "submit" },
      { name: "linefeed", ctrl: true, action: "submit" },
    ],
    onSubmit: () => {
      const prompt = promptInput.plainText.trim()
      if (!prompt) {
        return
      }

      options.onPromptSubmit(prompt)
      promptInput.clear()
      promptInput.focus()
    },
  })

  const palette = createPaletteUi(renderer, {
    onSubmit(command) {
      options.onPaletteSubmit(command)
    },
  })

  let streaming = false
  let sessionLabel = ""

  const renderStatus = () => {
    const mode = streaming ? "[streaming]" : "[ready]"
    const paletteHint = palette.isOpen() ? " | Palette open" : ""
    const sessionPart = sessionLabel ? ` | ${sessionLabel}` : ""

    statusText.content = `Ctrl+Enter submit | Ctrl+K palette | Ctrl+C abort/exit | Esc close/exit | ${mode}${paletteHint}${sessionPart}`
  }

  const openPalette = () => {
    promptInput.visible = false
    palette.open()
    renderStatus()
  }

  const closePalette = () => {
    palette.close()
    promptInput.visible = true
    promptInput.focus()
    renderStatus()
  }

  root.add(statusText)
  root.add(promptInput)
  root.add(palette.root)
  renderStatus()
  promptInput.focus()

  return {
    root,

    focusPrompt() {
      if (palette.isOpen()) {
        return
      }

      promptInput.focus()
    },

    openPalette,
    closePalette,

    isPaletteOpen() {
      return palette.isOpen()
    },

    setPaletteActions(actions) {
      palette.setActions(actions)
    },

    setStreaming(value) {
      streaming = value
      renderStatus()
    },

    setSessionLabel(label) {
      sessionLabel = label
      renderStatus()
    },

    destroy() {
      palette.destroy()
    },
  }
}
