import { anthropic as originalAnthropic, createAnthropic as _ } from "@ai-sdk/anthropic"
import { env } from "bun"
import SYSTEM_PROMPT from "./session/prompt/anthropic.txt"
import { tool, ToolLoopAgent } from "ai"
import { tools } from "./tool/registry"
import type { Context } from "./tool/tool"

type AuthType = "api" | "oauth"
const authType = "api" as AuthType

function anthropicProviderFromAuthType(authType: AuthType) {
  const params: Record<string, unknown> = {}

  if (authType === "oauth") {
    params.apiKey = ""
    params.baseUrl = "https://api.anthropic.com/v1"
    // params.headers = {
    //   "Authorization": "Bearer <your-api-key>",
    // }
    return originalAnthropic
  } else {
    params.apiKey = env.ANTHROPIC_API_KEY
    return originalAnthropic
  }
}

export const anthropic = anthropicProviderFromAuthType(authType)

// Load tools from registry
const registeredTools = await tools("anthropic", "claude-sonnet-4-5")

// Create context generator for tool execution
function createContext(toolCallId: string): Context {
  const abortController = new AbortController()
  return {
    sessionID: "cli-session",
    messageID: `msg-${Date.now()}`,
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

// Convert tools to the format expected by AI SDK
const toolsForAI = Object.fromEntries(
  registeredTools.map((t) => [
    t.id,
    tool({
      description: t.description,
      inputSchema: t.parameters,
      execute: async (args: any) => {
        const ctx = createContext(t.id)
        const result = await t.execute(args, ctx)
        return result.output
      },
    }),
  ]),
)

const agent = new ToolLoopAgent({
  model: anthropic("claude-sonnet-4-5"),
  instructions: SYSTEM_PROMPT,
  tools: toolsForAI,
})

const stdin = process.stdin
const stdout = process.stdout

console.log("Enter a prompt (or 'exit' to quit):\n")
stdout.write("> ")

for await (const line of stdin) {
  const input = line.toString().trim()

  if (input.toLowerCase() === "exit") {
    stdout.write("Goodbye\n")
    break
  }

  if (input) {
    const result = await agent.stream({
      prompt: input,
    })

    for await (const textPart of result.textStream) {
      stdout.write(textPart)
    }
    console.log()
  }

  stdout.write("\n> ")
}
