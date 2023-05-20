import { denoPlugins } from "esbuild_plugin_deno_loader";
import { replace as esbuildReplace } from "esbuild-plugin-replace";
import * as esbuild from "esbuild";
import * as path from "std/path/mod.ts";

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

const LANG_WORKER_PATH_REL = "./lang-worker.ts";
const LANG_WORKER_BUNDLE_PATH_REL = "../dist/web/lang-worker.js";
const langWorkerPath = path.fromFileUrl(
  import.meta.resolve(LANG_WORKER_PATH_REL),
);
const langWorkerModulePath = path.fromFileUrl(
  import.meta.resolve(LANG_WORKER_BUNDLE_PATH_REL),
);

const MAIN_PATH_REL = "./main.mts";
const MAIN_BUNDLE_PATH_REL = "../dist/web/main.js";
const mainPath = path.fromFileUrl(import.meta.resolve(MAIN_PATH_REL));
const mainBundlePath = path.fromFileUrl(
  import.meta.resolve(MAIN_BUNDLE_PATH_REL),
);

async function main() {
  const projDenoPlugins = denoPlugins({ importMapURL });
  // reduce bundle size by removing sentry's unused functionality
  // see https://docs.sentry.io/platforms/javascript/configuration/tree-shaking/
  const sentryPlugin = esbuildReplace({
    __SENTRY_DEBUG__: "false",
    __SENTRY_TRACING__: "false",
  });

  await bundleTs(workerPath, workerBundlePath, projDenoPlugins);
  await bundleTs(epubWorkerPath, epubWorkerModulePath);
  await bundleTs(langWorkerPath, langWorkerModulePath, projDenoPlugins);
  // @ts-ignore the joys of deno vs node
  await bundleTs(mainPath, mainBundlePath, [sentryPlugin]);

  // because the worker isn't truly an ESM (thanks Firefox), this hack is necessary
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
  plugins: esbuild.Plugin[] = [],
) {
  const buildOptions: esbuild.BuildOptions = {
    bundle: true,
    entryPoints: [sourcePath],
    format: "esm",
    metafile: true,
    minify: true,
    outfile,
    plugins,
    preserveSymlinks: true,
    sourcemap: "external",
  };
  const result = await esbuild.build(buildOptions);
  esbuild.stop();
  await Deno.writeTextFile(
    `${outfile}.meta.json`,
    JSON.stringify(result.metafile),
  );
}

if (import.meta.main) {
  await main();
}
