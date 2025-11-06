import { TsconfigAliases } from "@/aliases"
import { PackageExternalOptionsBase } from "@/externals"

/**
 * Whether to and how to clean the output directory before building.
 *
 * 1. `true`: (default): clean outdir when inside `root` and warn if outside.
 * 2. `false`: do not clean outdir.
 * 3. `"force"`: clean outdir regardless of whether it is inside `root`.
 */
export type CleanOutdirOptions = boolean | "force"

export type SpecialBuildOption = {
  mode: "lib" | "bin"
  input: string // Not glob.
  outdir: string
  cleanOutdir?: CleanOutdirOptions
}

export type BuildOptions = {
  root?: string
  out?: string
  bin?: string | string[] // Glob.
  lib?: string | string[] // Glob.
  specials?: Record<string, SpecialBuildOption>
  cleanOutdir?: CleanOutdirOptions

  tsconfig?: string | TsconfigAliases
  external?: PackageExternalOptionsBase
}
