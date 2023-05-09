import { denoPlugins } from "esbuild_plugin_deno_loader";
import * as esbuild from "esbuild";
import * as path from "std/path/mod.ts";
import { configPath } from "./build-conf.ts";

const IMPORT_MAP_PATH_REL = "./import_map.json";
const importMapPath = import.meta.resolve(IMPORT_MAP_PATH_REL);
const importMapURL = (new URL(importMapPath)).toString();

const WORKER_PATH_REL = "./worker.ts";
const WORKER_BUNDLE_PATH_REL = "../dist/web/worker.js";
const workerPath = path.fromFileUrl(import.meta.resolve(WORKER_PATH_REL));
const workerBundlePath = path.fromFileUrl(
  import.meta.resolve(WORKER_BUNDLE_PATH_REL),
);

const EPUB_WORKER_PATH_REL = "./epub-worker.ts";
const EPUB_WORKER_BUNDLE_PATH_REL = "../dist/web/epub-worker.js";
const epubWorkerPath = path.fromFileUrl(
  import.meta.resolve(EPUB_WORKER_PATH_REL),
);
const epubWorkerModulePath = path.fromFileUrl(
  import.meta.resolve(EPUB_WORKER_BUNDLE_PATH_REL),
);

const MAIN_PATH_REL = "./main.ts";
const MAIN_BUNDLE_PATH_REL = "../dist/web/main.js";
const mainPath = path.fromFileUrl(import.meta.resolve(MAIN_PATH_REL));
const mainBundlePath = path.fromFileUrl(
  import.meta.resolve(MAIN_BUNDLE_PATH_REL),
);

const FILES_TO_COPY = [
  "./index.html",
  "./node_modules/@picocss/pico/css/pico.min.css",
  "./node_modules/@picocss/pico/css/pico.min.css.map",
];

async function main() {
  const distPath = configPath("distDir");
  const copyOps: [string, string][] = FILES_TO_COPY.map((pathStr) => {
    const src = path.fromFileUrl(import.meta.resolve(pathStr));
    const fileName = path.basename(src);
    const dest = path.join(distPath, fileName);
    return [src, dest];
  });
  for await (const [src, dest] of copyOps) {
    await Deno.copyFile(src, dest);
  }

  // module workers aren't supported across all browsers
  await bundleTs(workerPath, workerBundlePath, "iife", true);
  await bundleTs(epubWorkerPath, epubWorkerModulePath, "iife");
  await bundleTs(mainPath, mainBundlePath, "esm");

  // because the worker isn't an ESM (thanks Firefox), this hack is necessary
  const workerText = await Deno.readTextFile(workerBundlePath);
  const replacedWorkerText = workerText.replaceAll(
    "import.meta.url",
    "self.location.href",
  );
  await Deno.writeTextFile(workerBundlePath, replacedWorkerText);
}

export async function bundleTs(
  sourcePath: string,
  outfile: string,
  format: "esm" | "iife",
  deno: boolean = false,
) {
  const plugins = deno ? denoPlugins({ importMapURL }) : [];
  const buildOptions: esbuild.BuildOptions = {
    bundle: true,
    entryPoints: [sourcePath],
    format: "esm",
    minify: true,
    outfile,
    plugins,
    sourcemap: true,
  };
  await esbuild.build(buildOptions);
  esbuild.stop();
}

if (import.meta.main) {
  await main();
}
