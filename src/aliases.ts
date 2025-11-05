import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { RolldownPlugin } from "rolldown"

export type TsconfigAliases = {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

export function tsconfigAliases(tsconfig?: string | TsconfigAliases) {
  return !tsconfig || typeof tsconfig === "string"
    ? tsconfigAliasesFromFile(tsconfig as string | undefined)
    : tsconfigAliasesFromOptions(tsconfig as TsconfigAliases)
}

export function tsconfigAliasesFromFile(file?: string) {
  const raw = readFileSync(file || "tsconfig.json", "utf-8")
  const options = JSON.parse(raw) as {
    compilerOptions: {
      baseUrl: string
      paths: Record<string, string[]>
    }
  }
  return tsconfigAliasesFromOptions(options)
}

export function tsconfigAliasesFromOptions(options?: TsconfigAliases) {
  const { baseUrl, paths } = options?.compilerOptions || {}
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(paths || {})) {
    if (value.length > 0) {
      result[key.replace(/\/\*$/g, "")] = value.map((path) =>
        resolve(baseUrl || "", path.replace(/\/\*$/g, "").replace(/\*/g, "")),
      )
    }
  }
  return result
}

export function aliases(tsconfig?: string | TsconfigAliases): RolldownPlugin {
  return {
    name: "aliases",
    options(inputOptions) {
      return {
        ...inputOptions,
        resolve: {
          alias: {
            ...tsconfigAliases(tsconfig),
            ...inputOptions.resolve?.alias,
          },
        },
      }
    },
  }
}
