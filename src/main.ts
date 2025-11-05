import { program } from "commander"
import { argv } from "node:process"
import { build, BuildOptions } from "."
import { description, name, version } from "../package.json"

program
  .name(name)
  .description(description)
  .version(version)
  .option("-r --root <root>", "package root where package.json locates")
  .option("-o --out <out>", "outdir of common compilations")
  .option("-l --lib <lib>", "glob pattern of library entries")
  .option("-b --bin <bin>", "glob pattern of binary entries")
  .action(async (options: BuildOptions) => build(options))
  .parse(argv)
