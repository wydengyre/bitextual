import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { pooledMap } from "std/async/pool.ts";
import { sentences } from "./punkt.ts";
import { align, PARAGRAPH_MARKER } from "./hunalign.ts";
import { render } from "./render.ts";
import { Language } from "./types.ts";

// outputs alignment HTML

type LanguageTaggedText = [Language, string];
async function renderAlignment(
  [sourceLang, sourceText]: LanguageTaggedText,
  [targetLang, targetText]: LanguageTaggedText,
): Promise<string> {
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);

  const concurrency = navigator.hardwareConcurrency;
  const sourceTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    sourceParagraphs,
    (paragraph: string) => sentences(sourceLang, paragraph),
  );
  const targetTokenized: AsyncIterableIterator<string[]> = pooledMap(
    concurrency,
    targetParagraphs,
    (paragraph: string) => sentences(targetLang, paragraph),
  );

  // this is slow here, but should be faster once punkt is just wasm
  const sourceSplitParagraphs: string[][] = [];
  for await (const splitParagraph of sourceTokenized) {
    sourceSplitParagraphs.push(splitParagraph);
  }
  const targetSplitParagraphs: string[][] = [];
  for await (const splitParagraph of targetTokenized) {
    targetSplitParagraphs.push(splitParagraph);
  }

  if (sourceSplitParagraphs.length !== sourceParagraphs.length) {
    throw `assumed splitParagraphs ${sourceSplitParagraphs.length} and separated ${sourceParagraphs.length} would be equal`;
  }
  if (targetSplitParagraphs.length !== targetParagraphs.length) {
    throw `assumed splitParagraphs ${targetSplitParagraphs.length} and separated ${targetParagraphs.length} would be equal`;
  }

  const aligned: [string[], string[]][] = await align(
    sourceSplitParagraphs,
    targetSplitParagraphs,
  );

  // Paragraph alignment. Sentences require more data.
  // TODO: Refine this algo... Sometimes two paragraphs on the source correspond to only one on the target.
  // The important thing should be which <p> elements align
  const alignedParagraphs: [string[], string[]][] = [];
  let sourcePos = 0;
  let targetPos = 0;
  let sourceParagraphsCount = 0;
  let targetParagraphsCount = 0;
  for (const [sourceLines, targetLines] of aligned) {
    sourceParagraphsCount += countElements(sourceLines, PARAGRAPH_MARKER);
    targetParagraphsCount += countElements(targetLines, PARAGRAPH_MARKER);

    if (sourceParagraphsCount > 0 && targetParagraphsCount > 0) {
      const sourceParagraphsToPush = sourceParagraphs.slice(
        sourcePos,
        sourcePos + sourceParagraphsCount,
      );
      const targetParagraphsToPush = targetParagraphs.slice(
        targetPos,
        targetPos + targetParagraphsCount,
      );
      alignedParagraphs.push([sourceParagraphsToPush, targetParagraphsToPush]);
      sourcePos += sourceParagraphsCount;
      targetPos += targetParagraphsCount;
      sourceParagraphsCount = 0;
      targetParagraphsCount = 0;
    }
  }

  // // this is probably the case, since we won't end with a <p>
  if (sourcePos < sourceParagraphs.length) {
    const sourceParagraphsToPush = sourceParagraphs.slice(sourcePos);
    const targetParagraphsToPush = targetParagraphs.slice(targetPos);
    alignedParagraphs.push([sourceParagraphsToPush, targetParagraphsToPush]);
  }

  return render(alignedParagraphs);
}

export async function main() {
  const [sourceText, targetText] = await Promise.all([
    readFixtureString("goosebumps.chapter.txt"),
    readFixtureString("goosebumps.capitolo.txt"),
  ]);

  const rendered = await renderAlignment([Language.english, sourceText], [
    Language.french, // no training data for italian yet
    targetText,
  ]);
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
