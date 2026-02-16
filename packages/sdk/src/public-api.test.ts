import { describe, expect, test } from "bun:test"
import * as sdkPublicApi from "./index"
import type {
  CliAction,
  CliActionContext,
  CoreSession,
  CoreSessionState,
  CreateMinicodeOptions,
  Minicode,
  OpenSessionOptions,
  PluginMetadata,
  ProviderId,
  ResolvedSdkConfig,
  RuntimeCatalog,
  RuntimeOverride,
  SdkConfig,
  SerializedError,
  Session,
  SessionState,
  SessionSummary,
  ToolOutput,
  Turn,
  TurnEvent,
  TurnMessage,
  TurnRequest,
  TurnResponse,
} from "./index"

type PublicTypeImportSmoke = {
  cliAction: CliAction
  cliActionContext: CliActionContext
  minicode: Minicode
  session: Session
  sessionState: SessionState
  sessionSummary: SessionSummary
  runtimeCatalog: RuntimeCatalog
  runtimeOverride: RuntimeOverride
  createOptions: CreateMinicodeOptions
  openOptions: OpenSessionOptions
  providerId: ProviderId
  sdkConfig: SdkConfig
  resolvedConfig: ResolvedSdkConfig
  pluginMetadata: PluginMetadata
  turn: Turn
  turnEvent: TurnEvent
  turnRequest: TurnRequest
  turnResponse: TurnResponse
  turnMessage: TurnMessage
  toolOutput: ToolOutput
  serializedError: SerializedError
  coreSession: CoreSession
  coreSessionState: CoreSessionState
}

void (null as unknown as PublicTypeImportSmoke)

describe("SDK public API", () => {
  test("exports only approved runtime symbols", () => {
    expect(Object.keys(sdkPublicApi).sort()).toEqual([
      "PluginsConfigSchema",
      "ProviderIdSchema",
      "ResolvedSdkConfigSchema",
      "SdkConfigSchema",
      "createMinicode",
    ])
  })

  test("does not expose internal helpers through root exports", () => {
    expect("SessionStateSchema" in sdkPublicApi).toBe(false)
    expect("ToolOutputSchema" in sdkPublicApi).toBe(false)
    expect("PluginReferenceSchema" in sdkPublicApi).toBe(false)
    expect("FsSessionRepository" in sdkPublicApi).toBe(false)
    expect("createBuiltinTools" in sdkPublicApi).toBe(false)
  })
})
