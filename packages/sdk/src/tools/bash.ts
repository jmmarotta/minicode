import { z } from "zod"
import { defineTool, failure, success } from "@minicode/core"
import type { ArtifactStore } from "../session/artifact-store"
import { truncateByBytes } from "./shared"

const BashInputSchema = z.strictObject({
  command: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
})

type BashInput = z.output<typeof BashInputSchema>

type BashToolOptions = {
  cwd: string
  defaultTimeoutMs: number
  maxOutputBytes: number
  artifactStore?: ArtifactStore
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
  return defineTool<BashInput>({
    description: "Execute a shell command in the session working directory",
    inputSchema: BashInputSchema,
    execute: async (input: BashInput, callOptions) => {
      const timeoutMs = input.timeoutMs ?? options.defaultTimeoutMs
      const abortController = new AbortController()
      let cancelled = false

      const sourceAbort = callOptions.abortSignal
      if (sourceAbort) {
        if (sourceAbort.aborted) {
          cancelled = true
          abortController.abort(sourceAbort.reason)
        } else {
          sourceAbort.addEventListener(
            "abort",
            () => {
              cancelled = true
              abortController.abort(sourceAbort.reason)
            },
            { once: true },
          )
        }
      }

      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        abortController.abort(new Error("command timed out"))
      }, timeoutMs)

      try {
        const processRef = Bun.spawn(["bash", "-lc", input.command], {
          cwd: options.cwd,
          stdin: "ignore",
          stdout: "pipe",
          stderr: "pipe",
          signal: abortController.signal,
        })

        const [exitOutcome, stdout, stderr] = await Promise.all([
          processRef.exited
            .then((exitCode) => ({
              exitCode,
            }))
            .catch((error) => ({
              exitCode: null,
              error: error instanceof Error ? error.message : "unknown error",
            })),
          new Response(processRef.stdout).text().catch(() => ""),
          new Response(processRef.stderr).text().catch(() => ""),
        ])

        const formattedOutput = formatCommandOutput(stdout, stderr)
        const truncated = await truncateByBytes(formattedOutput, options.maxOutputBytes, {
          artifactStore: options.artifactStore,
          callOptions,
          artifactLabel: "bash-output",
        })

        if (timedOut) {
          return failure(
            `Command timed out after ${timeoutMs}ms`,
            {
              command: input.command,
              output: truncated.text,
            },
            {
              timeoutMs,
              exitCode: exitOutcome.exitCode,
              truncated: truncated.truncated,
              artifact: truncated.artifact,
              artifactError: truncated.artifactError,
            },
          )
        }

        if (cancelled) {
          return failure(
            "Command cancelled",
            {
              command: input.command,
              output: truncated.text,
            },
            {
              exitCode: exitOutcome.exitCode,
              truncated: truncated.truncated,
              artifact: truncated.artifact,
              artifactError: truncated.artifactError,
            },
          )
        }

        if ("error" in exitOutcome) {
          return failure(
            "Command execution failed",
            {
              command: input.command,
              output: truncated.text,
              error: exitOutcome.error,
            },
            {
              exitCode: exitOutcome.exitCode,
              truncated: truncated.truncated,
              artifact: truncated.artifact,
              artifactError: truncated.artifactError,
            },
          )
        }

        const ok = exitOutcome.exitCode === 0
        const outputMessage = ok
          ? `Command succeeded (exit ${exitOutcome.exitCode})`
          : `Command failed (exit ${exitOutcome.exitCode})`

        return (ok ? success : failure)(
          outputMessage,
          {
            command: input.command,
            output: truncated.text,
          },
          {
            exitCode: exitOutcome.exitCode,
            truncated: truncated.truncated,
            artifact: truncated.artifact,
            artifactError: truncated.artifactError,
          },
        )
      } catch (error) {
        return failure(
          "Command execution failed",
          {
            command: input.command,
            error: error instanceof Error ? error.message : "unknown error",
          },
          {
            timeoutMs,
          },
        )
      } finally {
        clearTimeout(timeout)
      }
    },
  })
}
