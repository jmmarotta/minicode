import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"

const app = "opencode"

const homeDir = os.homedir()
const data = path.join(homeDir, ".local", "share", app)
const cache = path.join(homeDir, ".cache", app)
const config = path.join(homeDir, ".config", app)
const state = path.join(homeDir, ".local", "state", app)

export const Path = {
  data,
  bin: path.join(data, "bin"),
  log: path.join(data, "log"),
  cache,
  config,
  state,
} as const

await Promise.all([
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
])

const CACHE_VERSION = "9"

const version = await Bun.file(path.join(Path.cache, "version"))
  .text()
  .catch(() => "0")

if (version !== CACHE_VERSION) {
  try {
    const contents = await fs.readdir(Path.cache)
    await Promise.all(
      contents.map((item) =>
        fs.rm(path.join(Path.cache, item), {
          recursive: true,
          force: true,
        }),
      ),
    )
  } catch (_e) {}
  await Bun.file(path.join(Path.cache, "version")).write(CACHE_VERSION)
}

export const Global = {
  Path,
}
