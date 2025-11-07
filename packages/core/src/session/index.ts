import { tool, ToolLoopAgent } from "ai"
import type { LanguageModel } from "ai"
import { tools } from "@/tool/registry"
import type { Context } from "@/tool/tool"
import { Ripgrep } from "@/file/ripgrep"
import { Global } from "@/global"
import { Filesystem } from "@/util/filesystem"
import { Instance } from "@/project/instance"
import path from "path"
import os from "os"

import PROMPT_ANTHROPIC from "./prompt/anthropic.txt"
import PROMPT_ANTHROPIC_SPOOF from "./prompt/anthropic_spoof.txt"
import PROMPT_SUMMARIZE from "./prompt/summarize.txt"
import PROMPT_TITLE from "./prompt/title.txt"

export interface SessionConfig {
  model: LanguageModel
  provider: string
  modelName: string
  systemPrompt?: string
}

export interface SessionInstance {
  agent: ToolLoopAgent
  sessionID: string
}

export namespace SystemPrompt {
  export function header(providerID: string) {
    if (providerID.includes("anthropic")) return [PROMPT_ANTHROPIC_SPOOF.trim()]
    return []
  }

  export function provider(_modelID: string) {
    return [PROMPT_ANTHROPIC]
  }

  export async function environment() {
    const project = Instance.project
    return [
      [
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Working directory: ${Instance.directory}`,
        `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
        `  Platform: ${process.platform}`,
        `  Today's date: ${new Date().toDateString()}`,
        `</env>`,
        `<project>`,
        `  ${
          project.vcs === "git"
            ? await Ripgrep.tree({
                cwd: Instance.directory,
                limit: 200,
              })
            : ""
        }`,
        `</project>`,
      ].join("\n"),
    ]
  }

  const LOCAL_RULE_FILES = [
    "AGENTS.md",
    "CLAUDE.md",
    "CONTEXT.md", // deprecated
  ]
  const GLOBAL_RULE_FILES = [
    path.join(Global.Path.config, "AGENTS.md"),
    path.join(os.homedir(), ".claude", "CLAUDE.md"),
  ]

  export async function custom() {
    const paths = new Set<string>()

    for (const localRuleFile of LOCAL_RULE_FILES) {
      const matches = await Filesystem.findUp(localRuleFile, Instance.directory, Instance.worktree)
      if (matches.length > 0) {
        matches.forEach((path) => paths.add(path))
        break
      }
    }

    for (const globalRuleFile of GLOBAL_RULE_FILES) {
      if (await Bun.file(globalRuleFile).exists()) {
        paths.add(globalRuleFile)
        break
      }
    }

    const found = Array.from(paths).map((p) =>
      Bun.file(p)
        .text()
        .catch(() => ""),
    )
    return Promise.all(found).then((result) => result.filter(Boolean))
  }

  export function summarize(providerID: string) {
    switch (providerID) {
      case "anthropic":
        return [PROMPT_ANTHROPIC_SPOOF.trim(), PROMPT_SUMMARIZE]
      default:
        return [PROMPT_SUMMARIZE]
    }
  }

  export function title(providerID: string) {
    switch (providerID) {
      case "anthropic":
        return [PROMPT_ANTHROPIC_SPOOF.trim(), PROMPT_TITLE]
      default:
        return [PROMPT_TITLE]
    }
  }
}

/**
 * Create a context for tool execution with a unique session ID
 */
export function createContext(sessionID: string, toolCallId: string): Context {
  const abortController = new AbortController()
  return {
    sessionID,
    messageID: Bun.randomUUIDv7(),
    agent: "minicode-cli",
    callID: toolCallId,
    abort: abortController.signal,
    metadata: (input) => {
      // For CLI, we could log metadata or ignore it
      if (input.title) {
        console.log(`\n[Tool: ${input.title}]`)
      }
    },
  }
}

/**
 * Build the complete system prompt from all sources
 */
async function buildSystemPrompt(provider: string, modelName: string): Promise<string> {
  const parts = [
    ...SystemPrompt.header(provider),
    ...SystemPrompt.provider(modelName),
    ...(await SystemPrompt.environment()),
    ...(await SystemPrompt.custom()),
  ]
  return parts.join("\n\n")
}

/**
 * Create a new session with configured agent and tools
 */
export async function createSession(config: SessionConfig): Promise<SessionInstance> {
  const sessionID = Bun.randomUUIDv7()

  // Load tools from registry
  const registeredTools = await tools(config.provider, config.modelName)

  // Convert tools to the format expected by AI SDK
  const toolsForAI = Object.fromEntries(
    registeredTools.map((t) => [
      t.id,
      tool({
        description: t.description,
        inputSchema: t.parameters,
        execute: async (args: any) => {
          const ctx = createContext(sessionID, t.id)
          const result = await t.execute(args, ctx)
          return result.output
        },
      }),
    ]),
  )

  // Build system prompt from all sources
  const systemPrompt = config.systemPrompt || (await buildSystemPrompt(config.provider, config.modelName))

  const agent = new ToolLoopAgent({
    model: config.model,
    instructions: systemPrompt,
    tools: toolsForAI,
  })

  return {
    agent,
    sessionID,
  }
}

export const Session = {
  async create(parentSessionID: string, description: string) {
    // Stub: create a session
    return { id: `session-${Date.now()}` }
  },
  async getMessage(sessionID: string, messageID: string) {
    // Stub: get message
    return {
      info: {
        role: "assistant" as const,
        modelID: "claude-3-5-sonnet-20241022",
        providerID: "anthropic",
      },
    }
  },
  abort(sessionID: string) {
    // Stub: abort a session
  },
  async prompt(options: {
    messageID: string
    sessionID: string
    model: { modelID: string; providerID: string }
    [key: string]: any
  }) {
    // Stub: send a prompt
    return {
      text: "",
      usage: { inputTokens: 0, outputTokens: 0 },
      parts: [],
    }
  },
}
