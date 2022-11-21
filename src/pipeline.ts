import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { pooledMap } from "std/async/pool.ts";
import { sentences } from "./punkt.ts";
import { align, PARAGRAPH_MARKER } from "./hunalign.ts";
import { render } from "./render.ts";

const ENGLISH = "en";
const FRENCH = "fr";

export async function main() {
  const [frenchText, englishText] = await Promise.all([
    readFixtureString("chapitre.txt"),
    readFixtureString("chapter.txt"),
  ]);

  const frenchParagraphs: string[] = paragraphs(frenchText);
  const englishParagraphs: string[] = paragraphs(englishText);

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
    frenchSplitParagraphs.push(splitParagraph);
  }
  const englishSplitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(englishTokenized)) {
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

  const aligned: [string[], string[]][] = await align(
    frenchSplitParagraphs,
    englishSplitParagraphs,
  );

  // Paragraph alignment. Sentences require more data.
  // TODO: Refine this algo... Sometimes two paragraphs on the left correspond to only one on the right.
  // The important thing should be which <p> elements align
  const alignedParagraphs: [string[], string[]][] = [];
  let leftPos = 0;
  let rightPos = 0;
  let leftParagraphsCount = 0;
  let rightParagraphsCount = 0;
  for (const [leftLines, rightLines] of aligned) {
    leftParagraphsCount += countElements(leftLines, PARAGRAPH_MARKER);
    rightParagraphsCount += countElements(rightLines, PARAGRAPH_MARKER);

    if (leftParagraphsCount > 0 && rightParagraphsCount > 0) {
      const leftParagraphsToPush = frenchParagraphs.slice(
        leftPos,
        leftPos + leftParagraphsCount,
      );
      const rightParagraphsToPush = englishParagraphs.slice(
        rightPos,
        rightPos + rightParagraphsCount,
      );
      alignedParagraphs.push([leftParagraphsToPush, rightParagraphsToPush]);
      leftPos += leftParagraphsCount;
      rightPos += rightParagraphsCount;
      leftParagraphsCount = 0;
      rightParagraphsCount = 0;
    }
  }

  // // this is probably the case, since we won't end with a <p>
  if (leftPos < frenchParagraphs.length) {
    const leftParagraphsToPush = frenchParagraphs.slice(leftPos);
    const rightParagraphsToPush = englishParagraphs.slice(rightPos);
    alignedParagraphs.push([leftParagraphsToPush, rightParagraphsToPush]);
  }

  // console.log(englishParagraphs[2]);
  // console.log("ALIGNED");
  // console.log(alignedParagraphs[1][0][0]);
  // console.log(alignedParagraphs[1][1][0]);
  const rendered = render(alignedParagraphs);
  console.log(rendered);
}

function countElements<T>(ts: T[], t: T): number {
  let count = 0;
  for (const e of ts) if (e === t) count++;
  return count;
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
