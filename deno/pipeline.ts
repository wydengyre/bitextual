import { paragraphs } from "../lib/textreader.ts";
import { Punkt } from "../lib/punkt.ts";
import { Hunalign, PARAGRAPH_MARKER } from "../lib/hunalign.ts";
import { render } from "../lib/render.ts";
import { Language, LanguageTaggedText } from "../lib/types.ts";
import { resourcePath } from "./resources.ts";
import { fromFileUrl } from "std/path/mod.ts";

const PUNKT_WASM_PATH = fromFileUrl(
  import.meta.resolve("../resources/punkt/punkt_bg.wasm"),
);

const HUNALIGN_WASM_PATH = fromFileUrl(
  import.meta.resolve("../resources/hunalign/web/hunalign.wasm"),
);

export async function renderAlignment(
  [sourceLang, sourceText]: LanguageTaggedText,
  [targetLang, targetText]: LanguageTaggedText,
): Promise<string> {
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);

  const [sourceTrainingData, targetTrainingData] = await Promise.all([
    getTrainingData(sourceLang),
    getTrainingData(targetLang),
  ]);
  const [punktWasm, hunalignWasm] = await Promise.all([
    Deno.readFile(PUNKT_WASM_PATH),
    Deno.readFile(HUNALIGN_WASM_PATH),
  ]);

  const punkt = await Punkt.create(punktWasm);
  const sourceTokenized = punkt.sentences(sourceTrainingData, sourceParagraphs);
  const targetTokenized = punkt.sentences(targetTrainingData, targetParagraphs);

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

  const dictionaryName = `${targetLang}-${sourceLang}`;
  const dictionaryPath = resourcePath(`hunalign/dictionaries/${dictionaryName}.dic`);
  const dictionary = await Deno.readFile(dictionaryPath);
  const hunalign = await Hunalign.create(hunalignWasm);
  const aligned: [string[], string[]][] = hunalign.align(
    dictionary,
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

function getTrainingData(l: Language): Promise<Uint8Array> {
  const languageData: Map<Language, string> = new Map([
    ["en", "english"],
    ["fr", "french"],
    ["it", "italian"],
    ["es", "spanish"],
  ]);

  const languageName = languageData.get(l)!;
  const languageFileName = `${languageName}.json`;
  const languagePath = fromFileUrl(import.meta.resolve(
    `../resources/punkt/data/${languageFileName}`,
  ));

  return Deno.readFile(languagePath);
}

function countElements<T>(ts: T[], t: T): number {
  let count = 0;
  for (const e of ts) if (e === t) count++;
  return count;
}
