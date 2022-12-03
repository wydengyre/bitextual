import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { pooledMap } from "std/async/pool.ts";
import { sentences } from "./punkt.ts";
import { align, PARAGRAPH_MARKER } from "./hunalign.ts";
import { render } from "./render.ts";

const ENGLISH = "en";
const FRENCH = "fr";
const ITALIAN = "it";

export async function main() {
  const [englishText, italianText] = await Promise.all([
    readFixtureString("goosebumps.chapter.txt"),
    readFixtureString("goosebumps.capitolo.txt"),
  ]);

  const englishParagraphs: string[] = paragraphs(englishText);
  const italianParagraphs: string[] = paragraphs(italianText);

  const concurrency = navigator.hardwareConcurrency;
  const englishTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    englishParagraphs,
    (paragraph: string) => sentences(ENGLISH, paragraph),
  );
  const italianTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    italianParagraphs,
    (paragraph: string) => sentences(ITALIAN, paragraph),
  );

  // this is slow here, but should be faster once punkt is just wasm
  const englishSplitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(englishTokenized)) {
    englishSplitParagraphs.push(splitParagraph);
  }
  const italianSplitParagraphs: string[][] = [];
  for await (const [number, splitParagraph] of enumerate(italianTokenized)) {
    italianSplitParagraphs.push(splitParagraph);
  }

  if (englishSplitParagraphs.length !== englishParagraphs.length) {
    console.error(
      `assumed splitParagraphs ${englishSplitParagraphs.length} and separated ${englishParagraphs.length} would be equal`,
    );
    Deno.exit(1);
  }
  if (italianSplitParagraphs.length !== italianParagraphs.length) {
    console.error(
      `assumed splitParagraphs ${italianSplitParagraphs.length} and separated ${italianParagraphs.length} would be equal`,
    );
    Deno.exit(1);
  }

  const aligned: [string[], string[]][] = await align(
    englishSplitParagraphs,
    italianSplitParagraphs,
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
      const leftParagraphsToPush = englishParagraphs.slice(
        leftPos,
        leftPos + leftParagraphsCount,
      );
      const rightParagraphsToPush = italianParagraphs.slice(
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
  if (leftPos < englishParagraphs.length) {
    const leftParagraphsToPush = englishParagraphs.slice(leftPos);
    const rightParagraphsToPush = italianParagraphs.slice(rightPos);
    alignedParagraphs.push([leftParagraphsToPush, rightParagraphsToPush]);
  }

  // console.log(italianParagraphs[2]);
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
