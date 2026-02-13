import { BoxRenderable, TextRenderable, TextareaRenderable, type CliRenderer } from "@opentui/core"

export type PaletteAction = {
  id: string
  title: string
  description: string
  usage: string
  allowDuringTurn: boolean
}

type CreatePaletteOptions = {
  onSubmit: (input: string) => void
}

export type PaletteUi = {
  root: BoxRenderable
  open: () => void
  close: () => void
  isOpen: () => boolean
  setActions: (actions: PaletteAction[]) => void
  destroy: () => void
}

function renderActionList(actions: PaletteAction[]): string {
  if (actions.length === 0) {
    return "No actions"
  }

  return actions
    .map((action, index) => {
      const busyTag = action.allowDuringTurn ? "" : " [idle]"
      return `${index + 1}. /${action.usage} - ${action.title}${busyTag}`
    })
    .join("\n")
}

export function createPaletteUi(renderer: CliRenderer, options: CreatePaletteOptions): PaletteUi {
  const root = new BoxRenderable(renderer, {
    id: "palette-root",
    width: "100%",
    flexGrow: 1,
    border: true,
    borderStyle: "single",
    borderColor: "#334155",
    padding: 1,
    flexDirection: "column",
    visible: false,
    backgroundColor: "#020617",
  })

  const header = new TextRenderable(renderer, {
    id: "palette-header",
    content: "Command Palette (Ctrl+Enter run, Esc close)",
    fg: "#fde68a",
  })

  const actionList = new TextRenderable(renderer, {
    id: "palette-actions",
    content: "",
    fg: "#e2e8f0",
  })

  const input = new TextareaRenderable(renderer, {
    id: "palette-input",
    width: "100%",
    height: 3,
    placeholder: "Type command, for example: new --provider openai --model gpt-4o-mini",
    keyBindings: [
      { name: "return", ctrl: true, action: "submit" },
      { name: "linefeed", ctrl: true, action: "submit" },
    ],
    onSubmit: () => {
      const text = input.plainText.trim()
      if (!text) {
        return
      }

      options.onSubmit(text)
      input.clear()
    },
  })

  root.add(header)
  root.add(actionList)
  root.add(input)

  return {
    root,

    open() {
      root.visible = true
      input.clear()
      input.focus()
      renderer.requestRender()
    },

    close() {
      root.visible = false
      input.clear()
      renderer.requestRender()
    },

    isOpen() {
      return root.visible
    },

    setActions(actions) {
      actionList.content = renderActionList(actions)
    },

    destroy() {},
  }
}
