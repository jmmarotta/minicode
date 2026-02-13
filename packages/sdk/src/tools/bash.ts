import { z } from "zod"
import { defineTool } from "./output"
import { failure, success, truncateByBytes } from "./shared"

const BashInputSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
})

type BashToolOptions = {
  cwd: string
  defaultTimeoutMs: number
  maxOutputBytes: number
}

function formatCommandOutput(stdout: string, stderr: string): string {
  const parts = []

  if (stdout.trim()) {
    parts.push(`stdout:\n${stdout.trimEnd()}`)
  }

  if (stderr.trim()) {
    parts.push(`stderr:\n${stderr.trimEnd()}`)
  }

  if (parts.length === 0) {
    return "(no output)"
  }

  return parts.join("\n\n")
}

export function createBashTool(options: BashToolOptions) {
  return defineTool({
    description: "Execute a shell command in the session working directory",
    inputSchema: BashInputSchema,
    execute: async (input, callOptions) => {
      const timeoutMs = input.timeoutMs ?? options.defaultTimeoutMs
      const abortController = new AbortController()

      const sourceAbort = callOptions.abortSignal
      if (sourceAbort) {
        sourceAbort.addEventListener(
          "abort",
          () => {
            abortController.abort(sourceAbort.reason)
          },
          { once: true },
        )
      }

      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        abortController.abort(new Error("command timed out"))
      }, timeoutMs)

      const processRef = Bun.spawn(["bash", "-lc", input.command], {
        cwd: options.cwd,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
        signal: abortController.signal,
      })

      try {
        const [exitCode, stdout, stderr] = await Promise.all([
          processRef.exited,
          new Response(processRef.stdout).text(),
          new Response(processRef.stderr).text(),
        ])

        const formattedOutput = formatCommandOutput(stdout, stderr)
        const truncated = truncateByBytes(formattedOutput, options.maxOutputBytes)

        if (timedOut) {
          return failure(
            `Command timed out after ${timeoutMs}ms`,
            {
              command: input.command,
              output: truncated.text,
            },
            {
              timeoutMs,
              truncated: truncated.truncated,
            },
          )
        }

        const ok = exitCode === 0
        const outputMessage = ok ? `Command succeeded (exit ${exitCode})` : `Command failed (exit ${exitCode})`

        return (ok ? success : failure)(
          outputMessage,
          {
            command: input.command,
            output: truncated.text,
          },
          {
            exitCode,
            truncated: truncated.truncated,
          },
        )
      } catch (error) {
        if (timedOut) {
          return failure(`Command timed out after ${timeoutMs}ms`, {
            command: input.command,
          })
        }

        return failure("Command execution failed", {
          command: input.command,
          error: error instanceof Error ? error.message : "unknown error",
        })
      } finally {
        clearTimeout(timeout)
      }
    },
  })
}
