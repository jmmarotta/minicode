export namespace LSP {
  export interface Diagnostic {
    message: string
    severity: "error" | "warning" | "info"
    line: number
    column: number
  }

  export namespace Diagnostic {
    export function pretty(diagnostic: Diagnostic): string {
      const severity = diagnostic.severity.toUpperCase()
      return `${severity} [${diagnostic.line}:${diagnostic.column}] ${diagnostic.message}`
    }
  }

  export async function check(filepath: string): Promise<any> {
    // LSP check stub - returns empty issues for now
    return { issues: [] }
  }

  export async function touchFile(filepath: string, _create?: boolean): Promise<void> {
    // LSP touchFile stub
  }

  export async function diagnostics(): Promise<Record<string, Diagnostic[]>> {
    // LSP diagnostics stub
    return {}
  }
}
