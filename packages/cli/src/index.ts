import { startCli } from "./cli/start"
import { formatUnknownError } from "./util/errors"

export async function main(argv: string[] = process.argv.slice(2)) {
  await startCli(argv)
}

if (import.meta.main) {
  main().catch((error) => {
    process.stderr.write(`[fatal] ${formatUnknownError(error)}\n`)
    process.exitCode = 1
  })
}
