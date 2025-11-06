import { existsSync, readdirSync, rmSync, statSync } from "node:fs"
import { join } from "node:path"

export function cleanDir(path: string) {
  if (!existsSync(path) || !statSync(path).isDirectory()) return
  for (const name of readdirSync(path)) {
    rmSync(join(path, name), { recursive: true })
  }
}
