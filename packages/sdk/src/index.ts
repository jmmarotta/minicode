export type SdkBootstrap = {
  name: "minicode-sdk"
  status: "scaffold-ready"
}

export function createMinicode(): SdkBootstrap {
  return {
    name: "minicode-sdk",
    status: "scaffold-ready",
  }
}

if (import.meta.main) {
  const bootstrap = createMinicode()
  console.log(`${bootstrap.name}: ${bootstrap.status}`)
}
