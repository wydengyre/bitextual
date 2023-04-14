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

  // retrieve the alignments of the original sentences, which punkt gives us,
  // using the alignments of the tokenized sentences, which hunalign gives us
  const notParagraphMarker = (str: string): boolean => str !== PARAGRAPH_MARKER;
  const filterOutParagraphMarker = (arr: string[]): string[] =>
    arr.filter(notParagraphMarker);
  const alignedWithoutParagraphs = aligned.map((
    [left, right],
  ) => [filterOutParagraphMarker(left), filterOutParagraphMarker(right)]);
  const sentenceLeftCursor = [0, 0];
  const sentenceRightCursor = [0, 0];
  const alignedSentences: [string[], string[]][] = alignedWithoutParagraphs.map(
    ([alignedLeft, alignedRight]) => {
      const newLefts: string[] = [];
      leftAlignedLoop:
      for (let i = 0; i < alignedLeft.length; i++) {
        let punktLeft = sourcePunktTokenized[sentenceLeftCursor[0]]
          ?.[sentenceLeftCursor[1]];
        while (punktLeft === undefined) {
          sentenceLeftCursor[0]++;
          if (sentenceLeftCursor[0] >= sourcePunktTokenized.length) {
            break leftAlignedLoop;
          }
          sentenceLeftCursor[1] = 0;
          punktLeft = sourcePunktTokenized[sentenceLeftCursor[0]]
            ?.[sentenceLeftCursor[1]];
        }
        newLefts.push(punktLeft);
        sentenceLeftCursor[1]++;
      }

      const newRights: string[] = [];
      rightAlignedLoop:
      for (let i = 0; i < alignedRight.length; i++) {
        let punktRight = targetPunktTokenized[sentenceRightCursor[0]]
          ?.[sentenceRightCursor[1]];
        while (punktRight === undefined) {
          sentenceRightCursor[0]++;
          if (sentenceRightCursor[0] >= targetPunktTokenized.length) {
            break rightAlignedLoop;
          }
          sentenceRightCursor[1] = 0;
          punktRight = targetPunktTokenized[sentenceRightCursor[0]]
            ?.[sentenceRightCursor[1]];
        }
        newRights.push(punktRight);
        sentenceRightCursor[1]++;
      }
      const ret: [string[], string[]] = [newLefts, newRights];
      return ret;
    },
  ).filter(([left, right]) => left.length > 0 && right.length > 0);

  return render(
    conf.sourceLanguage,
    conf.targetLanguage,
    alignedParagraphs,
    alignedSentences,
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
