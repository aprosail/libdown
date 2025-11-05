import { aliases, TsconfigAliases } from "@/aliases"
import { externals, PackageExternalOptionsBase } from "@/externals"
import { existsSync, globSync, statSync } from "node:fs"
import { resolve } from "node:path"
import {
  defineConfig,
  OutputOptions,
  rolldown,
  RolldownOptions,
  RolldownPlugin,
} from "rolldown"
import { dts } from "rolldown-plugin-dts"

export * from "@/aliases"
export * from "@/externals"

export type SpecialBuildOption = {
  mode: "lib" | "bin"
  input: string // Not glob.
  outdir: string
}

/**
 * Lib names will override bin names when conflict,
 * and special entries will override them all.
 */
export type BuildOptions = {
  root?: string
  out?: string
  bin?: string | string[] // Glob.
  lib?: string | string[] // Glob.
  specials?: Record<string, SpecialBuildOption>

  tsconfig?: string | TsconfigAliases
  external?: PackageExternalOptionsBase
}

export function generateRolldownOptions(options?: BuildOptions) {
  const {
    root,
    out = "out",
    bin = "src/main.ts",
    lib = "src/index.ts",
    specials,
    tsconfig: t,
    external: e,
  } = options || {}

  // Common data.
  const builds: RolldownOptions[] = []
  const plugins: RolldownPlugin[] = [aliases(t), externals({ root, ...e })]
  const common = defineConfig({
    plugins,
    output: {
      dir: out,
      format: "esm",
      minify: true,
      sourcemap: true,
      assetFileNames: "[hash].[ext]",
      chunkFileNames: "[hash].js",
      entryFileNames: "[name].js",
    },
  })

  // Libs and bins.
  const binEntries = bin ? globSync(bin) : []
  const libEntries = lib ? globSync(lib) : []
  if (binEntries.length > 0) builds.push({ ...common, input: binEntries })
  if (libEntries.length > 0) {
    const lib = defineConfig({ ...common, input: libEntries })
    const cJS: OutputOptions = { format: "cjs", entryFileNames: "[name].cjs" }
    const withDts = [...plugins, dts({ sourcemap: true })]
    builds.push({ ...lib, plugins: withDts, input: libEntries })
    builds.push({ ...lib, output: { ...lib.output, ...cJS } })
  }

  // Special options.
  function* specialOptions(): Generator<RolldownOptions> {
    for (const [name, value] of Object.entries(specials || {})) {
      if (existsSync(value.input) && statSync(value.input).isFile()) {
        yield defineConfig({
          plugins,
          input: { [name]: value.input },
          output: { ...common.output, dir: resolve(root || "", value.outdir) },
        })
      }
    }
  }

  return [...builds, ...specialOptions()]
}

export async function build(options?: BuildOptions) {
  async function rolldownBuild(options: RolldownOptions) {
    const bundler = await rolldown(options)
    const output = options.output
    if (!output) return
    return Array.isArray(output)
      ? Promise.all(output.map(bundler.write))
      : bundler.write(output)
  }
  await Promise.all(generateRolldownOptions(options).map(rolldownBuild))
}
