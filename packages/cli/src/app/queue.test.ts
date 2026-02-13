import { describe, expect, test } from "bun:test"
import { createTurnQueue } from "./queue"

describe("turn queue", () => {
  test("queues prompts FIFO while one turn is active", () => {
    const queue = createTurnQueue()

    const first = queue.beginOrQueue("one")
    expect(first).toEqual({
      type: "start",
      prompt: "one",
    })

    const second = queue.beginOrQueue("two")
    const third = queue.beginOrQueue("three")

    expect(second).toEqual({
      type: "queued",
      position: 1,
    })
    expect(third).toEqual({
      type: "queued",
      position: 2,
    })

    expect(queue.pendingCount()).toBe(2)
    expect(queue.hasActive()).toBe(true)

    expect(queue.settleActive()).toBe("two")
    expect(queue.pendingCount()).toBe(1)
    expect(queue.hasActive()).toBe(true)

    expect(queue.settleActive()).toBe("three")
    expect(queue.pendingCount()).toBe(0)
    expect(queue.hasActive()).toBe(true)

    expect(queue.settleActive()).toBeUndefined()
    expect(queue.hasActive()).toBe(false)
  })
})
