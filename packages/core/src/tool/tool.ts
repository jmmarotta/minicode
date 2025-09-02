import type { z } from "zod"

interface Metadata {
  [key: string]: unknown
}

export type Context<M extends Metadata = Metadata> = {
  sessionID: string
  messageID: string
  agent: string
  callID?: string
  abort: AbortSignal
  extra?: { [key: string]: unknown }
  metadata(input: { title?: string; metadata?: M }): void
}

export interface Info<Parameters extends z.ZodSchema = z.ZodSchema, M extends Metadata = Metadata> {
  id: string
  init: () => Promise<{
    description: string
    parameters: Parameters
    execute(
      args: z.infer<Parameters>,
      ctx: Context,
    ): Promise<{
      title: string
      metadata: M
      output: string
    }>
  }>
}

export function define<Parameters extends z.ZodSchema, Result extends Metadata>(
  id: string,
  init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>,
): Info<Parameters, Result> {
  return {
    id,
    init: async () => {
      if (init instanceof Function) return init()
      return init
    },
  }
}

export const Tool = {
  define,
}
