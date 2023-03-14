import * as esbuild from "esbuild";
import * as path from "std/path/mod.ts";
import { configPath } from "./build-conf.ts";

const distDir = configPath("distDir");
const PUNKT_DICTS_DIST_DIR = path.join(distDir, "punkt");
const PUNKT_DICTS_SOURCE_DIR = path.fromFileUrl(
  import.meta.resolve("../resources/punkt/data")
);

const PATHS_TO_COPY = [
  "./pico.min.css",
  "./pico.min.css.map",
].map((rel) => path.fromFileUrl(import.meta.resolve(rel)));

const INDEX_TEMPLATE = path.fromFileUrl(
  import.meta.resolve("./index.template.html"),
);
const INDEX_OUT_PATH = path.join(distDir, "index.html");

const MAIN_PATH = path.fromFileUrl(import.meta.resolve("./main.ts"));
const MAIN_OUT_NAME = "main.mjs";
const MAIN_OUT_PATH = path.join(distDir, MAIN_OUT_NAME);

const WORKER_PATH = path.fromFileUrl(import.meta.resolve("./worker.ts"));
const WORKER_OUT_NAME = "worker.js";
const WORKER_OUT_PATH = path.join(distDir, WORKER_OUT_NAME);

async function main() {
  await Deno.mkdir(distDir, { recursive: true });

  for (const inPath of PATHS_TO_COPY) {
    const bn = path.basename(inPath);
    const outPath = path.join(distDir, bn);
    await Deno.copyFile(inPath, outPath);
  }

  // copy punkt dicts
  await Deno.mkdir(PUNKT_DICTS_DIST_DIR, { recursive: true });
  for await (const entry of Deno.readDir(PUNKT_DICTS_SOURCE_DIR)) {
      const inPath = path.join(PUNKT_DICTS_SOURCE_DIR, entry.name);
      const outPath = path.join(PUNKT_DICTS_DIST_DIR, entry.name);
      await Deno.copyFile(inPath, outPath);
  }

  const indexTemplate = await Deno.readTextFile(INDEX_TEMPLATE);
  const indexHtml = indexTemplate.replace("${MAIN_JS}", MAIN_OUT_NAME);
  await Deno.writeTextFile(INDEX_OUT_PATH, indexHtml);

  await buildTs(MAIN_PATH, MAIN_OUT_PATH, "esm");
  await buildTs(WORKER_PATH, WORKER_OUT_PATH, "iife");
}

async function buildTs(
  inPath: string,
  outfile: string,
  format: esbuild.Format,
) {
  const buildOptions: esbuild.BuildOptions = {
    entryPoints: [inPath],
    outfile,
    bundle: true,
    minify: true,
    format,
    sourcemap: true,
  };
  await esbuild.build(buildOptions);
  esbuild.stop();
}

if (import.meta.main) {
  await main();
}
