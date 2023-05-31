import { fromFileUrl } from "std/path/mod.ts";

const OUT_PATH_REL = "../build/supported-languages.ts";
const OUT_PATH = fromFileUrl(import.meta.resolve(OUT_PATH_REL));

const DICTIONARIES_PATH_REL = "../resources/hunalign/dictionaries";
const DICTIONARIES_PATH = fromFileUrl(
  import.meta.resolve(DICTIONARIES_PATH_REL),
);

async function main() {
  const dictFiles = await toArray(Deno.readDir(DICTIONARIES_PATH));

  const supportedLanguages = dictFiles
    .filter((entry) => entry.isFile)
    .map((entry) => entry.name.split(".")[0].split("-"))
    .map(([target, source]) => [source, target]);
  supportedLanguages.sort();

  const supportedLanguagesJson = JSON.stringify(supportedLanguages, null, 2);

  const output =
    `export const supportedLanguages: [string, string][] = ${supportedLanguagesJson};`;

  await Deno.writeTextFile(OUT_PATH, output);
}

async function toArray<T>(asyncIterable: AsyncIterable<T>): Promise<T[]> {
  const arr: T[] = [];
  for await (const i of asyncIterable) {
    arr.push(i);
  }
  return arr;
}

if (import.meta.main) {
  await main();
}
