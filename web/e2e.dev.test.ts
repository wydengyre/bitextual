// a deno script to run e2e tests against a local dev server
import { configVal } from "./build-conf.ts";
import { serve } from "./serve.ts";
import { Deferred, deferred } from "std/async/deferred.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";
import { assert } from "std/testing/asserts.ts";

const TEST_PATH_REL = "./e2e-test/e2e-test.mts";
const TEST_PATH = fromFileUrl(import.meta.resolve(TEST_PATH_REL));
const E2E_TEST_DIR = dirname(TEST_PATH);
const PORT = Number.parseInt(configVal("devPort"));
const BASE_URL = `http://localhost:${PORT}`;

Deno.test("run e2e tests against dev server", () => {
  return withDevServer(runTests);
});

async function runTests(): Promise<void> {
  const cmd = new Deno.Command("node", {
    args: [
      "--test",
      "--loader",
      "ts-node/esm",
      TEST_PATH,
    ],
    env: {
      BITEXTUAL_TEST_BASE_URL: BASE_URL,
    },
    cwd: E2E_TEST_DIR,
  });
  const child = cmd.spawn();
  const res = await child.output();
  assert(res.success);
}

async function withDevServer<T>(fn: () => Promise<T>): Promise<T> {
  const abort = new AbortController();
  const startedPromise: Deferred<void> = deferred();
  const servePromise = serve({
    onListen: () => {
      startedPromise.resolve();
    },
    port: PORT,
    signal: abort.signal,
  });
  await startedPromise;
  const ret = await fn();

  console.error("stopping dev server");
  abort.abort();
  console.error("sent stop request, awaiting promise");
  await servePromise;
  console.error("done");

  return ret;
}
