import { aliases } from "@/aliases"
import { externals } from "@/externals"
import { BuildOptions } from "@/options"
import { cleanDir } from "@/utils"
import chalk from "chalk"
import { consola } from "consola"
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
export * from "@/options"

/**
 *
 * @param options
 * @returns
 */
export function generateRolldownOptions(options?: BuildOptions) {
  const {
    root = "",
    out = "out",
    bin = "src/main.ts",
    lib = "src/index.ts",
    specials,
    cleanOutdir = true,
    tsconfig: t,
    external: e,
  } = options || {}

  // Common data.
  const resolvedRoot = resolve(root)
  const builds: RolldownOptions[] = []
  const plugins: RolldownPlugin[] = [aliases(t), externals({ root, ...e })]
  const common = defineConfig({
    plugins,
    output: {
      dir: out,
      format: "esm",
      minify: true,
      sourcemap: true,
      assetFileNames: "assets/[hash].[ext]",
      chunkFileNames: "chunks/[hash].js",
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

  /** @yields current resolved special options. */
  function* specialOptions(): Generator<RolldownOptions> {
    for (const [name, value] of Object.entries(specials || {})) {
      const { input, outdir, cleanOutdir } = value
      if (existsSync(input) && statSync(input).isFile()) {
        let shouldCleanOutdir = false
        const inside = resolve(outdir).startsWith(resolvedRoot)

        // Resolve cleanOutdir.
        if (cleanOutdir) {
          if (inside || cleanOutdir === "force") shouldCleanOutdir = true
          if (!inside) {
            consola.warn(
              `cannot clean outdir(${chalk.dim(outdir)})` +
                `outside root(${chalk.dim(root)}) ` +
                `in special output from ${chalk.dim(input)}:` +
                chalk.dim(`you can set ${chalk.yellow("cleanOutdir")} of`) +
                chalk.dim(`this special build to ${chalk.yellow('"force"')}`) +
                chalk.dim(`to enable clean outdir regardless where it is.`),
            )
          }
        }

        yield defineConfig({
          plugins,
          input: { [name]: input },
          output: {
            ...common.output,
            dir: resolve(root, outdir),
            cleanDir: shouldCleanOutdir,
          },
        })
      }
    }
  }

  // Resolve cleanOutdir.
  if (cleanOutdir) {
    const inside = resolve(out).startsWith(resolvedRoot)
    if (inside || cleanOutdir === "force") cleanDir(out)
    if (!inside) {
      consola.warn(
        `cannot clean outdir(${chalk.dim(out)}) ` +
          `outside root(${chalk.dim(root)}): ` +
          chalk.dim(`you can set ${chalk.yellow("cleanOutdir")} `) +
          chalk.dim(`to ${chalk.yellow('"force"')}`) +
          chalk.dim(`to enable clean outdir regardless where it is.`),
      )
    }
  }

  return [...builds, ...specialOptions()]
}

/**
 * Build as the provided or default {@link BuildOptions},
 * preprocessed by {@link generateRolldownOptions},
 * powered by Rolldown.
 *
 * @param options configure how to build.
 */
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
