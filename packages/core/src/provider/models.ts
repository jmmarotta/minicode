export namespace ModelsDev {
  export interface Model {
    id: string
    name: string
    release_date?: string
    attachment: boolean
    reasoning: boolean
    temperature: boolean
    tool_call: boolean
    cost: {
      input: number
      output: number
      cache_read: number
      cache_write: number
    }
    options: Record<string, any>
    limit: {
      context: number
      output: number
    }
  }

  export interface Provider {
    id: string
    npm?: string
    name: string
    env: string[]
    api?: string
    models: Record<string, Model>
  }

  export async function get(): Promise<Record<string, Provider>> {
    // Return empty database for now - this should be populated from actual model data
    return {}
  }
}
