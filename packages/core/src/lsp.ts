export namespace LSP {
  export interface Diagnostic {
    message: string
    severity: "error" | "warning" | "info"
    line: number
    column: number
  }

  export async function check(filepath: string): Promise<any> {
    // LSP check stub - returns empty issues for now
    return { issues: [] }
  }

  export async function touchFile(filepath: string): Promise<void> {
    // LSP touchFile stub
  }

  export async function diagnostics(filepath: string): Promise<{ issues: Diagnostic[] }> {
    // LSP diagnostics stub
    return { issues: [] }
  }
}
