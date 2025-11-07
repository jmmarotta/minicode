import { Logger } from "@/util/logger"
import path from "path"
import os from "os"
import { z } from "zod"
import { mergeDeep, pipe } from "remeda"
import { Path } from "@/global"
import fs from "fs/promises"
import { lazy } from "@/util/lazy"
import { NamedError } from "@/util/error"
import { Auth } from "@/auth"
import { Instance } from "@/project/instance"

export namespace Config {
  const log = Logger.create({ service: "config" })

  export const state = Instance.state(async () => {
    const _auth = await Auth.all()
    const result = await global()

    if (!result.username) result.username = os.userInfo().username

    // Handle migration from autoshare to share field
    if (result.autoshare === true && !result.share) {
      result.share = "auto"
    }
    if (result.keybinds?.messages_revert && !result.keybinds.messages_undo) {
      result.keybinds.messages_undo = result.keybinds.messages_revert
    }

    // Handle migration from autoshare to share field
    if (result.autoshare === true && !result.share) {
      result.share = "auto"
    }
    if (result.keybinds?.messages_revert && !result.keybinds.messages_undo) {
      result.keybinds.messages_undo = result.keybinds.messages_revert
    }
    if (result.keybinds?.switch_mode && !result.keybinds.switch_agent) {
      result.keybinds.switch_agent = result.keybinds.switch_mode
    }
    if (result.keybinds?.switch_mode_reverse && !result.keybinds.switch_agent_reverse) {
      result.keybinds.switch_agent_reverse = result.keybinds.switch_mode_reverse
    }
    if (result.keybinds?.switch_agent && !result.keybinds.agent_cycle) {
      result.keybinds.agent_cycle = result.keybinds.switch_agent
    }
    if (result.keybinds?.switch_agent_reverse && !result.keybinds.agent_cycle_reverse) {
      result.keybinds.agent_cycle_reverse = result.keybinds.switch_agent_reverse
    }

    return result
  })

  export const Permission = z.union([z.literal("ask"), z.literal("allow"), z.literal("deny")])
  export type Permission = z.infer<typeof Permission>

  export const Command = z.object({
    template: z.string(),
    description: z.string().optional(),
    agent: z.string().optional(),
    model: z.string().optional(),
  })
  export type Command = z.infer<typeof Command>

  export const Agent = z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      prompt: z.string().optional(),
      tools: z.record(z.string(), z.boolean()).optional(),
      disable: z.boolean().optional(),
      description: z.string().optional().describe("Description of when to use the agent"),
      mode: z.union([z.literal("subagent"), z.literal("primary"), z.literal("all")]).optional(),
      permission: z
        .object({
          edit: Permission.optional(),
          bash: z.union([Permission, z.record(z.string(), Permission)]).optional(),
          webfetch: Permission.optional(),
        })
        .optional(),
    })
    .catchall(z.any())
  export type Agent = z.infer<typeof Agent>

  export const Keybinds = z
    .object({
      leader: z.string().optional().default("ctrl+x").describe("Leader key for keybind combinations"),
      app_help: z.string().optional().default("<leader>h").describe("Show help dialog"),
      app_exit: z.string().optional().default("ctrl+c,<leader>q").describe("Exit the application"),
      editor_open: z.string().optional().default("<leader>e").describe("Open external editor"),
      theme_list: z.string().optional().default("<leader>t").describe("List available themes"),
      project_init: z.string().optional().default("<leader>i").describe("Create/update AGENTS.md"),
      tool_details: z.string().optional().default("<leader>d").describe("Toggle tool details"),
      thinking_blocks: z.string().optional().default("<leader>b").describe("Toggle thinking blocks"),
      session_export: z.string().optional().default("<leader>x").describe("Export session to editor"),
      session_new: z.string().optional().default("<leader>n").describe("Create a new session"),
      session_list: z.string().optional().default("<leader>l").describe("List all sessions"),
      session_timeline: z.string().optional().default("<leader>g").describe("Show session timeline"),
      session_share: z.string().optional().default("<leader>s").describe("Share current session"),
      session_unshare: z.string().optional().default("none").describe("Unshare current session"),
      session_interrupt: z.string().optional().default("esc").describe("Interrupt current session"),
      session_compact: z.string().optional().default("<leader>c").describe("Compact the session"),
      session_child_cycle: z.string().optional().default("ctrl+right").describe("Cycle to next child session"),
      session_child_cycle_reverse: z
        .string()
        .optional()
        .default("ctrl+left")
        .describe("Cycle to previous child session"),
      messages_page_up: z.string().optional().default("pgup").describe("Scroll messages up by one page"),
      messages_page_down: z.string().optional().default("pgdown").describe("Scroll messages down by one page"),
      messages_half_page_up: z.string().optional().default("ctrl+alt+u").describe("Scroll messages up by half page"),
      messages_half_page_down: z
        .string()
        .optional()
        .default("ctrl+alt+d")
        .describe("Scroll messages down by half page"),
      messages_first: z.string().optional().default("ctrl+g").describe("Navigate to first message"),
      messages_last: z.string().optional().default("ctrl+alt+g").describe("Navigate to last message"),
      messages_copy: z.string().optional().default("<leader>y").describe("Copy message"),
      messages_undo: z.string().optional().default("<leader>u").describe("Undo message"),
      messages_redo: z.string().optional().default("<leader>r").describe("Redo message"),
      model_list: z.string().optional().default("<leader>m").describe("List available models"),
      model_cycle_recent: z.string().optional().default("f2").describe("Next recent model"),
      model_cycle_recent_reverse: z.string().optional().default("shift+f2").describe("Previous recent model"),
      agent_list: z.string().optional().default("<leader>a").describe("List agents"),
      agent_cycle: z.string().optional().default("tab").describe("Next agent"),
      agent_cycle_reverse: z.string().optional().default("shift+tab").describe("Previous agent"),
      input_clear: z.string().optional().default("ctrl+c").describe("Clear input field"),
      input_paste: z.string().optional().default("ctrl+v").describe("Paste from clipboard"),
      input_submit: z.string().optional().default("enter").describe("Submit input"),
      input_newline: z.string().optional().default("shift+enter,ctrl+j").describe("Insert newline in input"),
      // Deprecated commands
      switch_mode: z.string().optional().default("none").describe("@deprecated use agent_cycle. Next mode"),
      switch_mode_reverse: z
        .string()
        .optional()
        .default("none")
        .describe("@deprecated use agent_cycle_reverse. Previous mode"),
      switch_agent: z.string().optional().default("tab").describe("@deprecated use agent_cycle. Next agent"),
      switch_agent_reverse: z
        .string()
        .optional()
        .default("shift+tab")
        .describe("@deprecated use agent_cycle_reverse. Previous agent"),
      file_list: z.string().optional().default("none").describe("@deprecated Currently not available. List files"),
      file_close: z.string().optional().default("none").describe("@deprecated Close file"),
      file_search: z.string().optional().default("none").describe("@deprecated Search file"),
      file_diff_toggle: z.string().optional().default("none").describe("@deprecated Split/unified diff"),
      messages_previous: z.string().optional().default("none").describe("@deprecated Navigate to previous message"),
      messages_next: z.string().optional().default("none").describe("@deprecated Navigate to next message"),
      messages_layout_toggle: z.string().optional().default("none").describe("@deprecated Toggle layout"),
      messages_revert: z.string().optional().default("none").describe("@deprecated use messages_undo. Revert message"),
    })
    .strict()

  export const TUI = z.object({
    scroll_speed: z.number().min(1).optional().default(2).describe("TUI scroll speed"),
  })

  export const Info = z
    .object({
      $schema: z.string().optional().describe("JSON schema reference for configuration validation"),
      keybinds: Keybinds.optional().describe("Custom keybind configurations"),
      command: z
        .record(z.string(), Command)
        .optional()
        .describe("Command configuration, see https://opencode.ai/docs/commands"),
      snapshot: z.boolean().optional(),
      model: z.string().describe("Model to use in the format of provider/model, eg anthropic/claude-2").optional(),
      small_model: z
        .string()
        .describe("Small model to use for tasks like title generation in the format of provider/model")
        .optional(),
      agent: z
        .object({
          plan: Agent.optional(),
          build: Agent.optional(),
          general: Agent.optional(),
        })
        .catchall(Agent)
        .optional()
        .describe("Agent configuration, see https://opencode.ai/docs/agent"),
      permission: z
        .object({
          edit: Permission.optional(),
          bash: z.union([Permission, z.record(z.string(), Permission)]).optional(),
          webfetch: Permission.optional(),
        })
        .optional(),
      tools: z.record(z.string(), z.boolean()).optional(),
      username: z.string().optional(),
      autoshare: z.boolean().optional(),
      share: z.union([z.literal("auto"), z.literal("manual"), z.literal("never")]).optional(),
      provider: z.record(z.string(), z.any()).optional(),
      disabled_providers: z.array(z.string()).optional(),
    })
    .passthrough()

  export type Info = z.output<typeof Info>

  export const global = lazy(async () => {
    let result: Info = pipe({}, mergeDeep(await loadFile(path.join(Path.config, "config.json"))))

    await import(path.join(Path.config, "config"), {
      with: {
        type: "toml",
      },
    })
      .then(async (mod) => {
        const { provider, model, ...rest } = mod.default
        if (provider && model) result.model = `${provider}/${model}`
        result["$schema"] = "https://opencode.ai/config.json"
        result = mergeDeep(result, rest)
        await Bun.write(path.join(Path.config, "config.json"), JSON.stringify(result, null, 2))
        await fs.unlink(path.join(Path.config, "config"))
      })
      .catch(() => {})

    return result
  })

  async function loadFile(filepath: string): Promise<Info> {
    log.info("loading", { path: filepath })
    const text = await Bun.file(filepath)
      .text()
      .catch((err) => {
        if (err.code === "ENOENT") return
        throw new JsonError({ path: filepath }, { cause: err })
      })
    if (!text) return {}
    return load(text, filepath)
  }

  async function load(text: string, configFilepath: string) {
    text = text.replace(/\{env:([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || ""
    })

    const fileMatches = text.match(/\{file:[^}]+\}/g)
    if (fileMatches) {
      const configDir = path.dirname(configFilepath)
      const lines = text.split("\n")

      for (const match of fileMatches) {
        let filePath = match.replace(/^\{file:/, "").replace(/\}$/, "")
        if (filePath.startsWith("~/")) {
          filePath = path.join(os.homedir(), filePath.slice(2))
        }
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(configDir, filePath)
        const fileContent = (
          await Bun.file(resolvedPath)
            .text()
            .catch((error) => {
              const errMsg = `bad file reference: "${match}"`
              if (error.code === "ENOENT") {
                throw new InvalidError(
                  { path: configFilepath, message: errMsg + ` ${resolvedPath} does not exist` },
                  { cause: error },
                )
              }
              throw new InvalidError({ path: configFilepath, message: errMsg }, { cause: error })
            })
        ).trim()
        // escape newlines/quotes, strip outer quotes
        text = text.replace(match, JSON.stringify(fileContent).slice(1, -1))
      }
    }

    let data: any
    try {
      data = JSON.parse(text)
    } catch (error) {
      // Extract line and column from the error message
      const errorMessage = error instanceof Error ? error.message : String(error)
      const match = errorMessage.match(/position (\d+)/)
      
      if (match) {
        const position = parseInt(match[1], 10)
        const lines = text.split("\n")
        const beforeOffset = text.substring(0, position).split("\n")
        const line = beforeOffset.length
        const column = beforeOffset[beforeOffset.length - 1]!.length + 1
        const problemLine = lines[line - 1]

        const errorDetail = `JSON parse error at line ${line}, column ${column}`
        const formattedError = problemLine 
          ? `${errorDetail}\n   Line ${line}: ${problemLine}\n${"".padStart(column + 9)}^`
          : errorDetail

        throw new JsonError({
          path: configFilepath,
          message: `\n--- JSON Input ---\n${text}\n--- Error ---\n${formattedError}\n--- End ---`,
        })
      }
      
      throw new JsonError({
        path: configFilepath,
        message: `JSON parse error: ${errorMessage}`,
      })
    }

    const parsed = Info.safeParse(data)
    if (parsed.success) {
      if (!parsed.data.$schema) {
        parsed.data.$schema = "https://opencode.ai/config.json"
        await Bun.write(configFilepath, JSON.stringify(parsed.data, null, 2))
      }

      return data
    }

    throw new InvalidError({ path: configFilepath, issues: parsed.error.issues })
  }

  export const JsonError = NamedError.create(
    "ConfigJsonError",
    z.object({
      path: z.string(),
      message: z.string().optional(),
    }),
  )

  export const InvalidError = NamedError.create(
    "ConfigInvalidError",
    z.object({
      path: z.string(),
      issues: z.custom<z.ZodIssue[]>().optional(),
      message: z.string().optional(),
    }),
  )

  export function get() {
    return state()
  }
}
