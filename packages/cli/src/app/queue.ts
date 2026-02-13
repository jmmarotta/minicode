export type QueueDecision =
  | {
      type: "start"
      prompt: string
    }
  | {
      type: "queued"
      position: number
    }

export type TurnQueue = {
  beginOrQueue: (prompt: string) => QueueDecision
  settleActive: () => string | undefined
  hasActive: () => boolean
  pendingCount: () => number
  clearPending: () => void
}

export function createTurnQueue(): TurnQueue {
  const pending: string[] = []
  let active = false

  return {
    beginOrQueue(prompt: string): QueueDecision {
      if (active) {
        pending.push(prompt)
        return {
          type: "queued",
          position: pending.length,
        }
      }

      active = true
      return {
        type: "start",
        prompt,
      }
    },

    settleActive(): string | undefined {
      active = false

      const next = pending.shift()
      if (!next) {
        return undefined
      }

      active = true
      return next
    },

    hasActive() {
      return active
    },

    pendingCount() {
      return pending.length
    },

    clearPending() {
      pending.length = 0
    },
  }
}
