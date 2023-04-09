import { Punkt } from "./punkt.ts";
import { Hunalign, PARAGRAPH_MARKER } from "./hunalign.ts";
import { render } from "./render.ts";
import { tokenizeWords } from "./tokenize-words.ts";

export type AlignmentConfig = {
  sourceLanguage: string;
  targetLanguage: string;
  punktWasm: Uint8Array;
  punktSourceTrainingData: Uint8Array;
  punktTargetTrainingData: Uint8Array;
  hunalignWasm: Uint8Array;
  hunalignDictData: Uint8Array;
};

export async function align(
  sourceText: string,
  targetText: string,
  conf: AlignmentConfig,
): Promise<string> {
  // consider each line of text a paragraph
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);

  // use punkt to split those paragraphs into sentences
  const punkt = await Punkt.create(conf.punktWasm);
  const sourcePunktTokenized = punkt.sentences(
    conf.punktSourceTrainingData,
    sourceParagraphs,
  );
  const targetPunktTokenized = punkt.sentences(
    conf.punktTargetTrainingData,
    targetParagraphs,
  );

  // Use a word tokenizer to split those sentences into words, joined by spaces.
  // This gives a higher Hunalign score, as it will match more words.
  const sourceTokenized = sourcePunktTokenized.map((p) =>
    p.map((s) => tokenizeWords(s))
  );
  const targetTokenized = targetPunktTokenized.map((p) =>
    p.map((s) => tokenizeWords(s))
  );

  if (sourceTokenized.length !== sourceParagraphs.length) {
    throw `assumed tokenized paragraphs ${sourceTokenized.length} and separated ${sourceParagraphs.length} would be equal`;
  }
  if (targetTokenized.length !== targetParagraphs.length) {
    throw `assumed tokenized paragraphs ${targetTokenized.length} and separated ${targetParagraphs.length} would be equal`;
  }

  // run hunalign on the tokenized sentences
  const hunalign = await Hunalign.create(conf.hunalignWasm);
  const aligned: [string[], string[]][] = hunalign.align(
    conf.hunalignDictData,
    sourceTokenized,
    targetTokenized,
  );

  // use the aligned sentences to create alignments at the paragraph level
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

  // this is probably the case, since we won't end with a <p>
  if (sourcePos < sourceParagraphs.length) {
    const sourceParagraphsToPush = sourceParagraphs.slice(sourcePos);
    const targetParagraphsToPush = targetParagraphs.slice(targetPos);
    alignedParagraphs.push([sourceParagraphsToPush, targetParagraphsToPush]);
  }

  return render(
    conf.sourceLanguage,
    conf.targetLanguage,
    alignedParagraphs,
  );
}

export function paragraphs(plaintext: string): string[] {
  return plaintext.trim().split("\n");
}

function countElements<T>(ts: T[], t: T): number {
  let count = 0;
  for (const e of ts) if (e === t) count++;
  return count;
}
