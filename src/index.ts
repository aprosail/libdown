import { aliases } from "@/aliases"
import { externals } from "@/externals"
import {
  defineConfig,
  rolldown,
  RolldownOptions,
  RolldownPlugin,
} from "rolldown"
import { dts } from "rolldown-plugin-dts"

export * from "@/aliases"
export * from "@/externals"

export function generateRolldownOptions() {
  const plugins: RolldownPlugin[] = [aliases(), externals()]
  const common = defineConfig({
    plugins,
    input: "src/index.ts",
    output: { dir: "out", format: "esm", minify: true, sourcemap: true },
  })

  const esModule = defineConfig({
    ...common,
    plugins: [...plugins, dts({ sourcemap: true })],
  })

  const commonJS = defineConfig({
    ...common,
    output: { ...common.output, format: "cjs", entryFileNames: "[name].cjs" },
  })

  return [esModule, commonJS]
}

export async function build() {
  async function rolldownBuild(options: RolldownOptions) {
    const bundler = await rolldown(options)
    const output = options.output
    if (!output) return
    return Array.isArray(output)
      ? Promise.all(output.map(bundler.write))
      : bundler.write(output)
  }
  await Promise.all(generateRolldownOptions().map(rolldownBuild))
}
