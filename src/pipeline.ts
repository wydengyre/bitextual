import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { pooledMap } from "std/async/pool.ts";
import { sentences } from "./punkt.ts";

export async function main() {
  const LANG = "fr";
  const text = await readFixtureString("chapitre.txt");
  const separated = paragraphs(text);
  const concurrency = navigator.hardwareConcurrency;
  const tokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    separated,
    (paragraph: string) => sentences(LANG, paragraph),
  );
  for await (const splitParagraph of tokenized) {
    console.log(splitParagraph);
  }
}

if (import.meta.main) {
  await main();
}
