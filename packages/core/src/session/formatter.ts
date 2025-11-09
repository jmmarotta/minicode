import type { StepResult } from "ai"

interface ToolCall {
  toolName: string
  args?: Record<string, unknown>
  input?: Record<string, unknown>
}

interface ToolResult {
  toolName: string
  result?: {
    title?: string
    metadata?: Record<string, unknown>
    output?: string
  }
}

interface TodoInfo {
  content: string
  status: string // 'pending', 'in_progress', 'completed', 'cancelled'
  priority: string // 'high', 'medium', 'low'
  id: string
}

export interface FormatterOptions {
  verbose?: boolean
  showTools?: boolean
  showResults?: boolean
}

export class CLIFormatter {
  private options: FormatterOptions

  constructor(options: FormatterOptions = {}) {
    this.options = {
      verbose: false,
      showTools: true,
      showResults: true,
      ...options,
    }
  }

  /**
   * Format a step result for CLI output
   */
  formatStep(step: StepResult<any>): void {
    if (this.options.verbose) {
      console.log("Step:", JSON.stringify(step, null, 2))
      return
    }

    // Only show tool-related information if enabled
    if (!this.options.showTools) {
      return
    }

    if (step.toolCalls?.length > 0) {
      this.formatToolCalls(step.toolCalls as ToolCall[])
    }

    if (step.toolResults?.length > 0 && this.options.showResults) {
      this.formatToolResults(step.toolResults as ToolResult[])
    }
  }

  private formatToolCalls(toolCalls: ToolCall[]): void {
    console.log("\n")

    for (const toolCall of toolCalls) {
      const toolName = toolCall.toolName || (toolCall.args?.tool as string)
      const args = toolCall.args || toolCall.input || {}

      // Create a brief description of what the tool is doing
      const description = this.getToolDescription(toolName, args)

      if (description) {
        console.log(`[TOOL] ${description}`)
      }
    }
  }

  private formatToolResults(toolResults: ToolResult[]): void {
    for (const result of toolResults) {
      const toolName = result.toolName

      // Only format specific tools
      if (!["bash", "write", "edit", "multiedit", "todowrite", "todoread"].includes(toolName)) {
        continue
      }

      try {
        switch (toolName) {
          case "bash": {
            const metadata = result.result?.metadata as { output?: string; exit?: number; description?: string }
            if (metadata?.exit !== undefined && metadata.exit !== 0) {
              console.log(`  ⚠️  Command exited with code ${metadata.exit}`)
            } else if (metadata?.output && metadata.output.trim()) {
              // Show first line of output if successful
              const firstLine = metadata.output.split("\n")[0]
              if (firstLine && firstLine.length > 80) {
                console.log(`  ✓ ${firstLine.substring(0, 77)}...`)
              } else if (firstLine) {
                console.log(`  ✓ ${firstLine}`)
              }
            }
            break
          }

          case "write": {
            const metadata = result.result?.metadata as { diagnostics?: Record<string, unknown[]>; exists?: boolean }
            if (metadata?.diagnostics && Object.keys(metadata.diagnostics).length > 0) {
              const issueCount = Object.values(metadata.diagnostics).flat().length
              console.log(`  ⚠️  ${issueCount} diagnostic issue${issueCount !== 1 ? "s" : ""} found`)
            } else if (metadata?.exists === false) {
              console.log(`  ✓ File created`)
            } else {
              console.log(`  ✓ File updated`)
            }
            break
          }

          case "edit": {
            const metadata = result.result?.metadata as { diff?: string }
            if (metadata?.diff) {
              const lines = metadata.diff.split("\n").filter((line) => line.startsWith("+") || line.startsWith("-"))
              const additions = lines.filter((l) => l.startsWith("+")).length
              const deletions = lines.filter((l) => l.startsWith("-")).length
              if (additions > 0 || deletions > 0) {
                console.log(`  ✓ +${additions} -${deletions}`)
              }
            }
            break
          }

          case "multiedit": {
            const metadata = result.result?.metadata as { results?: unknown[] }
            if (metadata?.results && Array.isArray(metadata.results)) {
              console.log(`  ✓ ${metadata.results.length} edit${metadata.results.length !== 1 ? "s" : ""} applied`)
            }
            break
          }

          case "todowrite":
          case "todoread": {
            const metadata = result.result?.metadata as { todos?: TodoInfo[] }
            if (metadata?.todos) {
              this.formatTodoList(metadata.todos)
            }
            break
          }
        }
      } catch (error) {
        // Silently handle formatting errors to avoid breaking the CLI
        console.log(`  ⚠️  Error formatting ${toolName} result`)
      }
    }
  }

  private getToolDescription(toolName: string, args: Record<string, unknown>): string {
    switch (toolName) {
      case "list": {
        const path = (args.path as string) || "current directory"
        return `list → ${path}`
      }

      case "read":
      case "write":
      case "edit": {
        const filePath = (args.filePath as string) || "file"
        return `${toolName} → ${filePath}`
      }

      case "bash": {
        const command = (args.command as string) || "command"
        return `bash → ${command}`
      }

      case "glob": {
        const pattern = (args.pattern as string) || "pattern"
        return `search → ${pattern}`
      }

      case "grep": {
        const searchPattern = (args.pattern as string) || "pattern"
        return `grep → ${searchPattern}`
      }

      case "webfetch": {
        const url = (args.url as string) || "URL"
        return `fetch → ${url}`
      }

      case "task": {
        const taskDesc = (args.description as string) || "task"
        return `task → ${taskDesc}`
      }

      case "todowrite":
        return `update todo list`

      case "todoread":
        return `read todo list`

      default:
        return `${toolName}`
    }
  }

  /**
   * Format todo list for display
   * Shows todos in order with checkboxes, hides cancelled items
   */
  private formatTodoList(todos: TodoInfo[]): void {
    // Filter out cancelled items
    const visibleTodos = todos.filter((t) => t.status !== "cancelled")
    const cancelledCount = todos.length - visibleTodos.length

    // Count by status
    const active = visibleTodos.filter((t) => t.status !== "completed").length
    const completed = visibleTodos.filter((t) => t.status === "completed").length

    // Build summary
    let summary = `${active} active, ${completed} completed`
    if (cancelledCount > 0) {
      summary += `, ${cancelledCount} cancelled`
    }

    // Handle empty list
    if (visibleTodos.length === 0) {
      console.log(`  📝 Todo List: (empty)`)
      console.log("")
      return
    }

    console.log(`  📝 Todo List (${summary}):`)
    console.log("")

    // Display todos in order
    for (const todo of visibleTodos) {
      const checkbox = todo.status === "completed" ? "[X]" : "[ ]"
      const priority = this.formatPriority(todo.priority)
      const statusIndicator = todo.status === "in_progress" ? " ⟳" : ""

      console.log(`    ${checkbox} ${priority} ${todo.content}${statusIndicator}`)
    }

    console.log("")
  }

  private formatPriority(priority: string): string {
    switch (priority.toLowerCase()) {
      case "high":
        return "[HIGH]"
      case "medium":
        return "[MED] "
      case "low":
        return "[LOW] "
      default:
        return "      "
    }
  }

  /**
   * Format tool metadata (called during tool execution)
   */
  formatToolMetadata(toolName: string, args: Record<string, unknown>): void {
    if (this.options.verbose) {
      console.log(`[Tool: ${toolName}]`, args)
      return
    }

    if (!this.options.showTools) {
      return
    }

    // Special handling for bash: toolName contains the full command
    if (args.description) {
      // This is a bash tool call - toolName is the actual command
      console.log(`[TOOL] bash → ${toolName}`)
      return
    }

    const description = this.getToolDescription(toolName, args)
    if (description) {
      console.log(`[TOOL] ${description}`)
    }
  }
}

// Default formatter instance
export const formatter = new CLIFormatter()

// Convenience functions
export function formatStep(step: StepResult<any>, options?: FormatterOptions): void {
  if (options) {
    const fmt = new CLIFormatter(options)
    fmt.formatStep(step)
  } else {
    formatter.formatStep(step)
  }
}

export function formatToolMetadata(toolName: string, args: Record<string, unknown>, options?: FormatterOptions): void {
  if (options) {
    const fmt = new CLIFormatter(options)
    fmt.formatToolMetadata(toolName, args)
  } else {
    formatter.formatToolMetadata(toolName, args)
  }
}
