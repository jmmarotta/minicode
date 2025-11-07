import { z, type ZodType } from "zod"
import { Logger } from "@/util/logger"
import type { $ZodTypeDiscriminable } from "zod/v4/core"

const log = Logger.create({ service: "bus" })
type Subscription<T = unknown> = (event: T) => void

const state: {
  subscriptions: Map<unknown, Subscription[]>
} = {
  subscriptions: new Map(),
}

export type EventDefinition = ReturnType<typeof event>

const registry = new Map<string, EventDefinition>()

export function event<Type extends string, Properties extends ZodType>(type: Type, properties: Properties) {
  const result = {
    type,
    properties,
  }
  registry.set(type, result)
  return result
}

export function payloads() {
  return z.discriminatedUnion(
    "type",
    registry
      .entries()
      .map(([type, def]) =>
        z.object({
          type: z.literal(type),
          properties: def.properties,
        }),
      )
      .toArray() as unknown as [$ZodTypeDiscriminable, ...$ZodTypeDiscriminable[]],
  )
}

export async function publish<Definition extends EventDefinition>(
  def: Definition,
  properties: z.output<Definition["properties"]>,
) {
  const payload = {
    type: def.type,
    properties,
  }
  log.info("publishing", {
    type: def.type,
  })
  const pending = []
  for (const key of [def.type, "*"]) {
    const match = state.subscriptions.get(key)
    for (const sub of match ?? []) {
      pending.push(sub(payload))
    }
  }
  return Promise.all(pending)
}

export function subscribe<Definition extends EventDefinition>(
  def: Definition,
  callback: (event: { type: Definition["type"]; properties: z.infer<Definition["properties"]> }) => void,
) {
  return raw(def.type, callback)
}

export function once<Definition extends EventDefinition>(
  def: Definition,
  callback: (event: { type: Definition["type"]; properties: z.infer<Definition["properties"]> }) => "done" | undefined,
) {
  const unsub = subscribe(def, (event) => {
    if (callback(event)) unsub()
  })
}

export function subscribeAll(callback: (event: unknown) => void) {
  return raw("*", callback)
}

function raw<T = unknown>(type: string, callback: (event: T) => void) {
  log.info("subscribing", { type })
  const subscriptions = state.subscriptions
  const match = subscriptions.get(type) ?? []
  match.push(callback as Subscription)
  subscriptions.set(type, match)

  return () => {
    log.info("unsubscribing", { type })
    const match = subscriptions.get(type)
    if (!match) return
    const index = match.indexOf(callback as Subscription)
    if (index === -1) return
    match.splice(index, 1)
  }
}

export const Bus = {
  event,
  payloads,
  publish,
  subscribe,
  once,
  subscribeAll,
}
