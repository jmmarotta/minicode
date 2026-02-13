import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { loadSdkConfig } from "./load"
import type { SdkConfig } from "./schema"

async function createTempDirectory(prefix: string) {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

describe("loadSdkConfig", () => {
  test("merges defaults, files, env, and overrides by precedence", async () => {
    const cwd = await createTempDirectory("minicode-config-merge-")

    try {
      const globalConfigPath = path.join(cwd, "global-config.json")
      const projectDir = path.join(cwd, ".minicode")
      const projectConfigPath = path.join(projectDir, "config.json")

      await mkdir(projectDir, { recursive: true })

      await Bun.write(
        globalConfigPath,
        JSON.stringify({
          provider: "openai",
          model: "global-model",
          paths: {
            sessionsDir: "/global-sessions",
          },
          openaiCompatible: {
            name: "global-compatible",
            baseURL: "https://global.example/v1",
          },
          plugins: {
            "plugin.global": {},
          },
        }),
      )

      await Bun.write(
        projectConfigPath,
        JSON.stringify({
          provider: "google",
          model: "project-model",
          paths: {
            sessionsDir: "/project-sessions",
          },
          openaiCompatible: {
            name: "project-compatible",
          },
        }),
      )

      const { config } = await loadSdkConfig({
        cwd,
        env: {
          MINICODE_GLOBAL_CONFIG: globalConfigPath,
          MINICODE_PROVIDER: "anthropic",
          MINICODE_MODEL: "env-model",
          MINICODE_SESSIONS_DIR: "/env-sessions",
        },
        configOverrides: {
          provider: "openai-compatible",
          model: "override-model",
          openaiCompatible: {
            baseURL: "https://override.example/v1",
          },
        },
      })

      expect(config.provider).toBe("openai-compatible")
      expect(config.model).toBe("override-model")
      expect(config.paths.sessionsDir).toBe("/env-sessions")
      expect(config.openaiCompatible.name).toBe("project-compatible")
      expect(config.openaiCompatible.baseURL).toBe("https://override.example/v1")
      expect(config.plugins).toEqual({
        "plugin.global": {},
      })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("rejects non-global plugin declarations", async () => {
    const cwd = await createTempDirectory("minicode-config-plugins-")

    try {
      const globalConfigPath = path.join(cwd, "global-config.json")
      const projectDir = path.join(cwd, ".minicode")
      const projectConfigPath = path.join(projectDir, "config.json")

      await mkdir(projectDir, { recursive: true })
      await Bun.write(globalConfigPath, JSON.stringify({ plugins: { "plugin.global": {} } }))

      await Bun.write(
        projectConfigPath,
        JSON.stringify({
          plugins: {
            "plugin.project": {},
          },
        }),
      )

      let projectError: unknown
      try {
        await loadSdkConfig({
          cwd,
          env: {
            MINICODE_GLOBAL_CONFIG: globalConfigPath,
          },
        })
      } catch (error) {
        projectError = error
      }

      expect(projectError).toBeInstanceOf(Error)
      expect((projectError as Error).message).toContain("project config")
      expect((projectError as Error).message).toContain("global-only")

      await Bun.write(projectConfigPath, JSON.stringify({}))

      let overrideError: unknown
      try {
        await loadSdkConfig({
          cwd,
          env: {
            MINICODE_GLOBAL_CONFIG: globalConfigPath,
          },
          configOverrides: {
            model: "x",
            plugins: {
              "plugin.override": {},
            },
          } as unknown as Partial<Omit<SdkConfig, "plugins">>,
        })
      } catch (error) {
        overrideError = error
      }

      expect(overrideError).toBeInstanceOf(Error)
      expect((overrideError as Error).message).toContain("config overrides")
      expect((overrideError as Error).message).toContain("global-only")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  test("reports path-based validation errors for invalid config", async () => {
    const cwd = await createTempDirectory("minicode-config-invalid-")

    try {
      const globalConfigPath = path.join(cwd, "global-config.json")

      await Bun.write(
        globalConfigPath,
        JSON.stringify({
          provider: "invalid-provider",
        }),
      )

      let caught: unknown
      try {
        await loadSdkConfig({
          cwd,
          env: {
            MINICODE_GLOBAL_CONFIG: globalConfigPath,
          },
        })
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(Error)
      expect((caught as Error).message).toContain("Invalid SDK config")
      expect((caught as Error).message).toContain("provider")
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
