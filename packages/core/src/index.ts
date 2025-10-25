import { anthropic as originalAnthropic, createAnthropic } from "@ai-sdk/anthropic"
import { env } from "bun"
import { streamText } from "ai"

type AuthType = "api" | "oauth"
const authType = "api" as AuthType

function anthroopicProviderFromAuthType(authType: AuthType) {
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

export const anthropic = anthroopicProviderFromAuthType(authType)

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
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt: input,
    })

    for await (const textPart of result.textStream) {
      stdout.write(textPart)
    }
    console.log()
  }

  stdout.write("\n> ")
}
