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

  // this is slow here, but should be faster once punkt is just wasm
  const splitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(tokenized)) {
    console.log(number);
    splitParagraphs.push(splitParagraph);
  }

  if (splitParagraphs.length !== separated.length) {
    console.error(`assumed splitParagraphs ${splitParagraphs.length} and separated ${separated.length} would be equal`)
    Deno.exit(1);
  }

  for (const [i, paragraph] of separated.entries()) {
    console.log(`${paragraph}: ${splitParagraphs[i]}`);
  }
}

async function* enumerate<T>(ts: AsyncIterable<T>): AsyncIterable<[number, T]> {
  let i = 0;
  for await (const t of ts) {
    yield [i, t];
    i++;
  }
}

if (import.meta.main) {
  await main();
}
