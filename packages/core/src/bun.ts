export namespace BunProc {
  export async function install(packageName: string) {
    const proc = Bun.spawn(["bun", "install", packageName], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    return proc.exitCode === 0
  }
}
