import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { RolldownPlugin } from "rolldown"

/**
 * Necessary fields about aliases in tsconfig.json.
 * Only necessary fields are defined here,
 * all other fields are omitted.
 */
export type TsconfigAliases = {
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

/**
 * Parse tsconfig.json file or {@link TsconfigAliases} object.
 *
 * 1. `undefined`: use `tsconfig.json` file in current working directory.
 * 2. `string`: specified tsconfig.json file path.
 * 3. `object`: specified {@link TsconfigAliases} object.
 *
 * Currently, it cannot resolve `extends` field in tsconfig.json.
 *
 * This function encapsulates both {@link tsconfigAliasesFromFile}
 * and {@link tsconfigAliasesFromOptions} for convenience.
 * There are type guards which might cause performance issues.
 * For performance sensitive scenarios,
 * you may call those two function directly.
 *
 * @param tsconfig tsconfig.json file path or {@link TsconfigAliases} object.
 * @returns parsed aliases with {@link resolve}d paths.
 */
export function tsconfigAliases(tsconfig?: string | TsconfigAliases) {
  return !tsconfig || typeof tsconfig === "string"
    ? tsconfigAliasesFromFile(tsconfig as string | undefined)
    : tsconfigAliasesFromOptions(tsconfig as TsconfigAliases)
}

/**
 * Parse tsconfig.json file to get aliases.
 *
 * 1. `undefined`: use `tsconfig.json` file in current working directory.
 * 2. `string`: specified tsconfig.json file path.
 * 3. All returned path will be {@link resolve}d.
 *
 * Currently, it cannot resolve `extends` field in tsconfig.json.
 *
 * @param file tsconfig.json file path.
 * @returns parsed aliases with resolved paths.
 */
export function tsconfigAliasesFromFile(file?: string) {
  const raw = readFileSync(file || "tsconfig.json", "utf-8")
  const options = JSON.parse(raw) as TsconfigAliases
  return tsconfigAliasesFromOptions(options)
}
/**
 * Parse {@link TsconfigAliases} object to get aliases.
 *
 * The object might be undefined,
 * and even necessary fields might be undefined,
 * which will only cause an empty returned object.
 * No error will be thrown in such cases.
 *
 * Currently, it cannot resolve `extends` field in tsconfig.json.
 *
 * @param options {@link TsconfigAliases} object.
 * @returns parsed aliases with resolved paths.
 */
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

/**
 * A rolldown plugin to resolve aliases.
 *
 * 1. `undefined`: use `tsconfig.json` file in current working directory.
 * 2. `string`: specified tsconfig.json file path.
 * 3. `object`: specified {@link TsconfigAliases} object.
 *
 * Currently, it cannot resolve `extends` field in tsconfig.json.
 *
 * @param tsconfig tsconfig.json file path or {@link TsconfigAliases} object.
 * @returns rolldown plugin with aliases.
 */
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
