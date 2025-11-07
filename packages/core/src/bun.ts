export namespace BunProc {
  export async function install(packageName: string, version: string): Promise<string> {
    const proc = Bun.spawn(["bun", "install", `${packageName}@${version}`], {
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    if (proc.exitCode !== 0) {
      throw new Error(`Failed to install ${packageName}@${version}`)
    }
    return packageName
  }
}
