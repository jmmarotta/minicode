import { Bus } from "@/bus"
import { z } from "zod"

export namespace MessageV2 {
  export interface ToolPart {
    id: string
    sessionID: string
    messageID: string
    type: "tool"
    [key: string]: any
  }

  export const Event = {
    PartUpdated: Bus.event(
      "message.v2.part.updated",
      z.object({
        part: z.any(),
      }),
    ),
  }
}
