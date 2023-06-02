import { denoPlugins } from "esbuild_plugin_deno_loader";
import { replace as esbuildReplace } from "esbuild-plugin-replace";
import * as esbuild from "esbuild";
import * as path from "std/path/mod.ts";
import { PurgeCSS } from "purgecss";

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

const MIXPANEL_WORKER_PATH_REL = "./mixpanel-worker.ts";
const MIXPANEL_WORKER_BUNDLE_PATH_REL = "../dist/web/mixpanel-worker.js";
const mixpanelWorkerPath = path.fromFileUrl(
  import.meta.resolve(MIXPANEL_WORKER_PATH_REL),
);
const mixpanelWorkerModulePath = path.fromFileUrl(
  import.meta.resolve(MIXPANEL_WORKER_BUNDLE_PATH_REL),
);

const MAIN_PATH_REL = "./main.mts";
const MAIN_BUNDLE_PATH_REL = "../dist/web/main.js";
const mainPath = path.fromFileUrl(import.meta.resolve(MAIN_PATH_REL));
const mainBundlePath = path.fromFileUrl(
  import.meta.resolve(MAIN_BUNDLE_PATH_REL),
);

const TUTORIAL_PATH_REL = "./tutorial/index.html";
const tutorialPath = path.fromFileUrl(import.meta.resolve(TUTORIAL_PATH_REL));

const CONTACT_PATH_REL = "./contact/index.html";
const contactPath = path.fromFileUrl(import.meta.resolve(CONTACT_PATH_REL));

const PICO_CSS_REL = "./pico.min.css";
const picoCssPath = path.fromFileUrl(import.meta.resolve(PICO_CSS_REL));
const PICO_CSS_DIST_REL = "../dist/web/pico.min.css";
const picoCssDistPath = path.fromFileUrl(
  import.meta.resolve(PICO_CSS_DIST_REL),
);

async function main() {
  const releaseName = Deno.args[Deno.args.length - 1];
  const projDenoPlugins = denoPlugins({ importMapURL });

  // outputting the worker as iife wasn't working, so we have to replace
  // this due to its use in emscripten
  const replaceImportMetaPlugin = esbuildReplace({
    "import.meta.url": "self.location.href",
  });

  // reduce bundle size by removing sentry's unused functionality
  // see https://docs.sentry.io/platforms/javascript/configuration/tree-shaking/
  const sentryPlugin = esbuildReplace({
    __SENTRY_DEBUG__: "false",
    __SENTRY_TRACING__: "false",
    __BITEXTUAL_RELEASE__: releaseName,
  });

  await bundleTs(workerPath, workerBundlePath, [
    // @ts-ignore the joys of deno vs node
    replaceImportMetaPlugin,
    ...projDenoPlugins,
  ]);
  await bundleTs(epubWorkerPath, epubWorkerModulePath);
  await bundleTs(
    langWorkerPath,
    langWorkerModulePath,
    projDenoPlugins,
  );
  await bundleTs(
    mixpanelWorkerPath,
    mixpanelWorkerModulePath,
  );

  // @ts-ignore the joys of deno vs node
  await bundleTs(mainPath, mainBundlePath, [sentryPlugin]);

  const [{ css }] = await new PurgeCSS().purge({
    content: [tutorialPath, contactPath],
    css: [picoCssPath],
    safelist: [":where"],
  });
  await Deno.writeTextFile(picoCssDistPath, css);
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
    legalComments: "none",
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
