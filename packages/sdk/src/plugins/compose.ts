import type { ToolSet } from "ai"
import type { ComposedCliAction, LoadedPlugin } from "./types"

export type ComposedSdkContributions = {
  tools: ToolSet
  instructionFragments: string[]
  cliActions: ComposedCliAction[]
}

function normalizeActionKey(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    throw new Error("Plugin compose failed [action conflict]: command id or alias cannot be empty")
  }

  return normalized
}

export function composeSdkContributions(builtinTools: ToolSet, plugins: LoadedPlugin[]): ComposedSdkContributions {
  const tools: ToolSet = { ...builtinTools }
  const instructionFragments: string[] = []
  const cliActions: ComposedCliAction[] = []
  const seenActionKeys = new Map<string, { reference: string }>()

  for (const loadedPlugin of plugins) {
    const pluginTools = loadedPlugin.contribution.sdk?.tools
    if (pluginTools) {
      for (const [toolName, toolDef] of Object.entries(pluginTools)) {
        if (Object.hasOwn(tools, toolName)) {
          throw new Error(
            `Plugin compose failed [tool conflict] ${loadedPlugin.normalizedReference}: duplicate tool '${toolName}'`,
          )
        }
        tools[toolName] = toolDef
      }
    }

    const fragments = loadedPlugin.contribution.sdk?.instructionFragments || []
    instructionFragments.push(...fragments)

    const pluginActions = loadedPlugin.contribution.cli?.actions ?? []
    for (const pluginAction of pluginActions) {
      const actionId = normalizeActionKey(pluginAction.id)
      const actionAliases = (pluginAction.aliases ?? []).map((alias) => normalizeActionKey(alias))
      const actionKeys = [actionId, ...actionAliases]
      const localKeys = new Set<string>()

      for (const actionKey of actionKeys) {
        if (localKeys.has(actionKey)) {
          throw new Error(
            `Plugin compose failed [action conflict] ${loadedPlugin.normalizedReference}: duplicate action id/alias '${actionKey}' within action '${actionId}'`,
          )
        }
        localKeys.add(actionKey)

        const duplicate = seenActionKeys.get(actionKey)
        if (duplicate) {
          throw new Error(
            `Plugin compose failed [action conflict] ${loadedPlugin.normalizedReference}: duplicate action id/alias '${actionKey}' (already registered by ${duplicate.reference})`,
          )
        }
      }

      for (const actionKey of actionKeys) {
        seenActionKeys.set(actionKey, {
          reference: loadedPlugin.normalizedReference,
        })
      }

      cliActions.push({
        id: actionId,
        title: pluginAction.title.trim(),
        description: pluginAction.description?.trim(),
        aliases: actionAliases,
        allowDuringTurn: pluginAction.allowDuringTurn ?? false,
        run: pluginAction.run,
        sourcePluginId: loadedPlugin.plugin.id,
        sourceReference: loadedPlugin.normalizedReference,
      })
    }
  }

  return {
    tools,
    instructionFragments,
    cliActions,
  }
}
