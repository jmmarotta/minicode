import { createMinicode } from "@minicode/sdk"

export function runCliBootstrap() {
  const sdk = createMinicode()
  process.stdout.write(`minicode scaffold ready (${sdk.status})\n`)
}

if (import.meta.main) {
  runCliBootstrap()
}
