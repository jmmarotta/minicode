import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { loadPlugins } from "./load"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

describe("loadPlugins", () => {
  test("loads file URL and package plugin references", async () => {
    const cwd = await createTempDirectory("minicode-plugins-load-")
    const packageName = `minicode-plugin-test-${Date.now()}`
    const packageDir = path.join(process.cwd(), "node_modules", packageName)

    try {
      const filePluginPath = path.join(cwd, "file-plugin.mjs")
      await Bun.write(
        filePluginPath,
        `
export default function filePluginFactory() {
  return {
    id: "file.plugin",
    apiVersion: 1,
    setup() {
      return {
        sdk: {
          instructionFragments: ["from-file"],
        },
      }
    },
  }
}
`,
      )

      await mkdir(packageDir, { recursive: true })
      await Bun.write(
        path.join(packageDir, "package.json"),
        JSON.stringify({
          name: packageName,
          type: "module",
          exports: "./index.js",
        }),
      )
      await Bun.write(
        path.join(packageDir, "index.js"),
        `
export default function packagePluginFactory() {
  return {
    id: "package.plugin",
    apiVersion: 1,
    setup() {
      return {
        sdk: {
          instructionFragments: ["from-package"],
        },
      }
    },
  }
}
`,
      )

      const loaded = await loadPlugins({
        plugins: {
          [pathToFileURL(filePluginPath).toString()]: {},
          [packageName]: {},
        },
        cwd,
        globalConfigDir: cwd,
        sdkVersion: "0.1.0",
      })

      expect(loaded.map((plugin) => plugin.plugin.id).sort()).toEqual(["file.plugin", "package.plugin"])
    } finally {
      await rm(packageDir, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("fails fast for invalid contracts and duplicate ids", async () => {
    const cwd = await createTempDirectory("minicode-plugins-errors-")

    try {
      const badPluginPath = path.join(cwd, "bad-plugin.mjs")
      await Bun.write(
        badPluginPath,
        `
export default function badPluginFactory() {
  return {
    apiVersion: 1,
  }
}
`,
      )

      let badContractError: unknown
      try {
        await loadPlugins({
          plugins: {
            [pathToFileURL(badPluginPath).toString()]: {},
          },
          cwd,
          globalConfigDir: cwd,
          sdkVersion: "0.1.0",
        })
      } catch (error) {
        badContractError = error
      }

      expect(badContractError).toBeInstanceOf(Error)
      expect((badContractError as Error).message).toContain("[validate]")

      const badActionPath = path.join(cwd, "bad-action-plugin.mjs")
      await Bun.write(
        badActionPath,
        `
export default function badActionPluginFactory() {
  return {
    id: "bad.action",
    apiVersion: 1,
    setup() {
      return {
        cli: {
          actions: [
            {
              id: "broken",
              title: "Broken",
              run: "not-a-function",
            },
          ],
        },
      }
    },
  }
}
`,
      )

      let badActionError: unknown
      try {
        await loadPlugins({
          plugins: {
            [pathToFileURL(badActionPath).toString()]: {},
          },
          cwd,
          globalConfigDir: cwd,
          sdkVersion: "0.1.0",
        })
      } catch (error) {
        badActionError = error
      }

      expect(badActionError).toBeInstanceOf(Error)
      expect((badActionError as Error).message).toContain("[validate]")
      expect((badActionError as Error).message).toContain("actions")

      const dupAPath = path.join(cwd, "dup-a.mjs")
      const dupBPath = path.join(cwd, "dup-b.mjs")

      await Bun.write(
        dupAPath,
        `
export default function dupAFactory() {
  return {
    id: "dup.plugin",
    apiVersion: 1,
  }
}
`,
      )

      await Bun.write(
        dupBPath,
        `
export default function dupBFactory() {
  return {
    id: "dup.plugin",
    apiVersion: 1,
  }
}
`,
      )

      let duplicateIdError: unknown
      try {
        await loadPlugins({
          plugins: {
            [pathToFileURL(dupAPath).toString()]: {},
            [pathToFileURL(dupBPath).toString()]: {},
          },
          cwd,
          globalConfigDir: cwd,
          sdkVersion: "0.1.0",
        })
      } catch (error) {
        duplicateIdError = error
      }

      expect(duplicateIdError).toBeInstanceOf(Error)
      expect((duplicateIdError as Error).message).toContain("[compose]")
      expect((duplicateIdError as Error).message).toContain("duplicate plugin id")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("detects duplicate normalized references", async () => {
    const cwd = await createTempDirectory("minicode-plugins-normalize-")

    try {
      const pluginDir = path.join(cwd, "plugins")
      await mkdir(pluginDir, { recursive: true })

      const pluginPath = path.join(pluginDir, "same-plugin.mjs")
      await Bun.write(
        pluginPath,
        `
export default function samePluginFactory() {
  return {
    id: "same.plugin",
    apiVersion: 1,
  }
}
`,
      )

      const directReference = pathToFileURL(pluginPath).toString()
      const aliasReference = `  ${directReference}  `

      let duplicateReferenceError: unknown
      try {
        await loadPlugins({
          plugins: {
            [aliasReference]: {},
            [directReference]: {},
          },
          cwd,
          globalConfigDir: cwd,
          sdkVersion: "0.1.0",
        })
      } catch (error) {
        duplicateReferenceError = error
      }

      expect(duplicateReferenceError).toBeInstanceOf(Error)
      expect((duplicateReferenceError as Error).message).toContain("[normalize]")
      expect((duplicateReferenceError as Error).message).toContain("duplicate normalized reference")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
