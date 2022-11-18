import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { pooledMap } from "std/async/pool.ts";
import { sentences } from "./punkt.ts";
import {align} from "./hunalign.ts";

const ENGLISH = "en";
const FRENCH = "fr";

export async function main() {
  const [frenchText, englishText] = await Promise.all([
    readFixtureString("chapitre.txt"),
    readFixtureString("chapter.txt"),
  ]);

  const frenchParagraphs = paragraphs(frenchText);
  const englishParagraphs = paragraphs(englishText);

  const concurrency = navigator.hardwareConcurrency;
  const frenchTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    frenchParagraphs,
    (paragraph: string) => sentences(FRENCH, paragraph),
  );
  const englishTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    englishParagraphs,
    (paragraph: string) => sentences(ENGLISH, paragraph),
  );

  // this is slow here, but should be faster once punkt is just wasm
  const frenchSplitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(frenchTokenized)) {
    console.log(number);
    frenchSplitParagraphs.push(splitParagraph);
  }
  const englishSplitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(englishTokenized)) {
    console.log(number);
    englishSplitParagraphs.push(splitParagraph);
  }

  if (frenchSplitParagraphs.length !== frenchParagraphs.length) {
    console.error(
      `assumed splitParagraphs ${frenchSplitParagraphs.length} and separated ${frenchParagraphs.length} would be equal`,
    );
    Deno.exit(1);
  }
  if (englishSplitParagraphs.length !== englishParagraphs.length) {
    console.error(
      `assumed splitParagraphs ${englishSplitParagraphs.length} and separated ${englishParagraphs.length} would be equal`,
    );
    Deno.exit(1);
  }

  const aligned = await align(frenchSplitParagraphs, englishSplitParagraphs);
  console.log(aligned);

  // TODO: paragraph alignment
  // const alignedParagraphs: [string[], string[]][] = [];
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
