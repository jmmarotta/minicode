// import { createAnthropicProvider, type AuthType } from "./auth"
import { anthropic } from "@ai-sdk/anthropic"
import type { LanguageModel } from "ai"
import { createSession } from "./session"
import { Instance } from "./project/instance"

async function main() {
  // Determine working directory
  const directory = process.cwd()

  // Provide context for the entire application
  await Instance.provide(directory, async () => {
    // Initialize session (now with context available)
    const session = await createSession({
      model: anthropic("claude-sonnet-4-5") as LanguageModel,
      provider: "anthropic",
      modelName: "claude-sonnet-4-5",
    })

    // CLI Interface
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
        const result = await session.agent.stream({
          prompt: input,
        })

        for await (const textPart of result.textStream) {
          stdout.write(textPart)
        }
        console.log()
      }

      stdout.write("\n> ")
    }

    // Clean up state when done
    await Instance.dispose()
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
