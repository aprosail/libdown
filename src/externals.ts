import { readFileSync } from "node:fs"
import { builtinModules } from "node:module"
import { join } from "node:path"
import { ExternalOption, RolldownPlugin } from "rolldown"

/**
 * Basic options for package externals.
 *
 * 1. Root default to cwd.
 * 2. Exclude have higher priority than includes.
 * 3. Dependencies default to true (to be externalized).
 *
 * This type is designed for higher level encapsulations.
 * For individual usages, you may refer to {@link PackageExternalOptions}.
 */
export type PackageExternalOptionsBase = {
  excludes?: (string | RegExp)[]
  includes?: (string | RegExp)[]

  dependencies?: boolean
  devDependencies?: boolean
  peerDependencies?: boolean
}

/**
 * Options for package externals.
 *
 * 1. Root default to cwd.
 * 2. Exclude have higher priority than includes.
 * 3. Dependencies default to true (to be externalized).
 */
export type PackageExternalOptions = PackageExternalOptionsBase & {
  root?: string
}

/**
 * Generate external option function for bundlers.
 *
 * It will exclude all builtin node APIs by default.
 * And external about dependencies will be parsed from manifest file
 * (package.json) at the root directory (the `root` option, default to cwd).
 *
 * @param options Package external options.
 * @returns External option function for bundlers.
 */
export function packageExternals(options?: PackageExternalOptions) {
  const {
    root,
    includes = [],
    excludes = [],
    dependencies = true,
    devDependencies,
    peerDependencies,
  } = options || {}

  const externals: string[] = []
  if (dependencies || devDependencies || peerDependencies) {
    const manifestFile = join(root || "", "package.json")
    const manifest = JSON.parse(readFileSync(manifestFile, "utf-8"))

    if (dependencies && manifest.dependencies)
      externals.push(...Object.keys(manifest.dependencies))
    if (devDependencies && manifest.devDependencies)
      externals.push(...Object.keys(manifest.devDependencies))
    if (peerDependencies && manifest.peerDependencies) {
      externals.push(...Object.keys(manifest.peerDependencies))
    }
  }

  return ((id, _parentId, isResolved) => {
    // Include and exclude.
    for (const item of excludes) if (id.match(item)) return true
    for (const item of includes) if (id.match(item)) return false

    // Parsed and build-in options.
    if (isResolved) return false
    if (id.match(/^node:/) || externals.includes(id)) return true
    for (const name of externals) if (id.startsWith(`${name}/`)) return true
    if (builtinModules.includes(id)) return true
  }) satisfies ExternalOption
}

/**
 * A rolldown plugin for externals.
 *
 * It will exclude all builtin node APIs by default.
 * And external about dependencies will be parsed from manifest file
 * (package.json) at the root directory (the `root` option, default to cwd).
 *
 * @param options Package external options.
 * @returns Rolldown plugin for externals.
 */
export function externals(options?: PackageExternalOptions): RolldownPlugin {
  return {
    name: "externals",
    options(inputOptions) {
      const excludes: (string | RegExp)[] = []
      const external = inputOptions.external
      if (external && typeof external !== "function") {
        excludes.push(...(Array.isArray(external) ? external : [external]))
      }

      return {
        ...inputOptions,
        external: packageExternals({
          ...options,
          excludes: [...excludes, ...(options?.excludes || [])],
        }),
      }
    },
  }
}
