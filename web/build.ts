import * as esbuild from "esbuild";
import * as path from "std/path/mod.ts";
import { configPath } from "./build-conf.ts";

const distDir = configPath("distDir");

const PATHS_TO_COPY = [
  "./index.html",
  "./pico.min.css",
  "./pico.min.css.map",
].map((rel) => path.fromFileUrl(import.meta.resolve(rel)));

const MAIN_PATH = path.fromFileUrl(import.meta.resolve("./main.ts"));
const MAIN_OUT_PATH = path.join(distDir, "main.mjs");

async function main() {
  await Deno.mkdir(distDir, { recursive: true });

  for (const inPath of PATHS_TO_COPY) {
    const bn = path.basename(inPath);
    const outPath = path.join(distDir, bn);
    await Deno.copyFile(inPath, outPath);
  }

  await buildTs(MAIN_PATH, MAIN_OUT_PATH);
}

async function buildTs(inPath: string, outfile: string) {
  const buildOptions: esbuild.BuildOptions = {
    entryPoints: [inPath],
    outfile,
    bundle: true,
    minify: true,
    format: "esm",
    sourcemap: true,
  };
  await esbuild.build(buildOptions);
  esbuild.stop();
}

if (import.meta.main) {
  await main();
}
