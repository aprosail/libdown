import { program } from "commander"
import { argv } from "node:process"
import { build } from "."
import { description, name, version } from "../package.json"

program
  .name(name)
  .description(description)
  .version(version)
  .option("-o --outdir <outdir>", "outdir of the bundles")
  .action((_) => build())
  .parse(argv)
