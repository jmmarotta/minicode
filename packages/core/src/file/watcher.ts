import { z } from "zod"
import { Bus } from "@/bus"
import fs from "fs"
import { Logger } from "@/util/logger"

const log = Logger.create({ service: "file.watcher" })

export const Event = {
  Updated: Bus.event(
    "file.watcher.updated",
    z.object({
      file: z.string(),
      event: z.union([z.literal("rename"), z.literal("change")]),
    }),
  ),
}

const state: {
  watcher: fs.FSWatcher | null
  cleanupRegistered: boolean
} = {
  watcher: null,
  cleanupRegistered: false,
}

// Note: SIGKILL (kill -9) cannot be caught and will not allow graceful cleanup
function registerCleanupHandlers() {
  if (state.cleanupRegistered) return
  state.cleanupRegistered = true

  const cleanup = () => {
    if (state.watcher) {
      try {
        state.watcher.close()
        state.watcher = null
        log.info("watcher stopped during process exit")
      } catch (error) {
        log.error("error stopping watcher during exit", { error })
      }
    }
  }

  const cleanupAndExit = (code: number = 0) => {
    cleanup()
    process.exit(code)
  }

  process.once("SIGINT", () => cleanupAndExit(0))
  process.once("SIGTERM", () => cleanupAndExit(0))
  process.once("SIGHUP", () => cleanupAndExit(1))
  process.once("SIGUSR1", () => cleanupAndExit(0))
  process.once("SIGUSR2", () => cleanupAndExit(0))
  process.once("uncaughtException", (error) => {
    log.error("uncaught exception, cleaning up", { error })
    cleanupAndExit(1)
  })
  process.once("unhandledRejection", (reason) => {
    log.error("unhandled rejection, cleaning up", { reason })
    cleanupAndExit(1)
  })
  process.once("beforeExit", cleanup)
  process.once("exit", cleanup)
}

export function init(path: string = process.cwd()) {
  registerCleanupHandlers()

  if (state.watcher) {
    state.watcher.close()
  }

  try {
    state.watcher = fs.watch(path, { recursive: true }, (event, file) => {
      log.info("change", { file, event })
      if (!file) return

      Bus.publish(Event.Updated, {
        file,
        event,
      })
    })
    log.info("watcher initialized", { path })
  } catch (error) {
    log.error("failed to initialize watcher", { error })
    state.watcher = null
  }
}

export function stop() {
  if (state.watcher) {
    state.watcher.close()
    state.watcher = null
    log.info("watcher stopped")
  }
}

export const FileWatcher = {
  Event,
  init,
  stop,
}
