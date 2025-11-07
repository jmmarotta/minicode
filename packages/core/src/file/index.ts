export * as Watcher from "./watcher"
export * as FileTime from "./time"
export * as Ripgrep from "./ripgrep"

// Re-export commonly used items
import { Bus } from "@/bus"
import { z } from "zod"
import { Event as WatcherEvent } from "./watcher"

export const Event = {
  ...WatcherEvent,
  Edited: Bus.event(
    "file.edited",
    z.object({
      file: z.string(),
    })
  ),
}

export const File = {
  Event,
}
