import { Punkt } from "./punkt.ts";
import { Hunalign, PARAGRAPH_MARKER } from "./hunalign.ts";
import { render } from "./render.ts";

export type AlignmentConfig = {
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
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);

  const punkt = await Punkt.create(conf.punktWasm);
  const sourceTokenized = punkt.sentences(
    conf.punktSourceTrainingData,
    sourceParagraphs,
  );
  const targetTokenized = punkt.sentences(
    conf.punktTargetTrainingData,
    targetParagraphs,
  );

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

  const hunalign = await Hunalign.create(conf.hunalignWasm);
  const aligned: [string[], string[]][] = hunalign.align(
    conf.hunalignDictData,
    sourceSplitParagraphs,
    targetSplitParagraphs,
  );

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

export function paragraphs(plaintext: string): string[] {
  return plaintext.trim().split("\n");
}

function countElements<T>(ts: T[], t: T): number {
  let count = 0;
  for (const e of ts) if (e === t) count++;
  return count;
}
