import z from "zod"
// import tools here
import type { Agent } from "../agent/agent"

const ALL = []

export function ids() {
  return ALL.map((t) => t.id)
}

export async function tools(providerID: string, _modelID: string) {
  const result = await Promise.all(
    ALL.map(async (t) => ({
      id: t.id,
      ...(await t.init()),
    })),
  )
}

export async function enabled(
  _providerID: string,
  modelID: string,
  agent: Agent.Info,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  result["patch"] = false

  if (agent.permission.edit === "deny") {
    result["edit"] = false
    result["patch"] = false
    result["write"] = false
  }
  if (agent.permission.bash["*"] === "deny" && Object.keys(agent.permission.bash).length === 1) {
    result["bash"] = false
  }
  if (agent.permission.webfetch === "deny") {
    result["webfetch"] = false
  }

  return result
}
