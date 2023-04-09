import * as HunalignLib from "../resources/hunalign/web/hunalign.js";

export const PARAGRAPH_MARKER = "<p>";

// I have yet to find a better way to do this.
type LibHunalign = Awaited<ReturnType<typeof HunalignLib.Hunalign.create>>;

export class Hunalign {
  #hunalign: LibHunalign;

  private constructor(hunalign: LibHunalign) {
    this.#hunalign = hunalign;
  }

  private sentences(
    dictionary: Uint8Array,
    source: string,
    target: string,
  ): [number, number][] {
    const te = new TextEncoder();
    const sourceBinary = te.encode(source);
    const targetBinary = te.encode(target);
    return this.#hunalign.run(dictionary, sourceBinary, targetBinary);
  }

  align(
    dictionary: Uint8Array,
    sourceSplitParagraphs: string[][],
    targetSplitParagraphs: string[][],
  ): [string[], string[]][] {
    const sourceText = textifySplitParagraphs(sourceSplitParagraphs);
    const targetText = textifySplitParagraphs(targetSplitParagraphs);

    const ladder = this.sentences(dictionary, sourceText, targetText);

    const sourceLines = sourceText.split("\n");
    const targetLines = targetText.split("\n");
    const matches: [string[], string[]][] = [];
    let oldLPrime = 0;
    let oldRPrime = 0;
    for (let i = 0, l = 0, r = 0; i < ladder.length; i++) {
      const [lPrime, rPrime] = ladder[i];

      if (lPrime === oldLPrime && rPrime !== oldRPrime) {
        const [_, previousRight] = matches[matches.length - 1];
        for (; r <= rPrime; r++) {
          previousRight.push(targetLines[r]);
        }
        continue;
      }

      if (rPrime === oldRPrime && lPrime !== oldLPrime) {
        const [previousLeft] = matches[matches.length - 1];
        for (; l <= lPrime; l++) {
          previousLeft.push(sourceLines[l]);
        }
        continue;
      }

      const leftLines: string[] = [];
      for (; l <= lPrime; l++) {
        leftLines.push(sourceLines[l]);
      }

      const rightLines: string[] = [];
      for (; r <= rPrime; r++) {
        rightLines.push(targetLines[r]);
      }

      matches.push([leftLines, rightLines]);
      oldLPrime = lPrime;
      oldRPrime = rPrime;
    }
    return matches;
  }

  static async create(hunalignWasm: Uint8Array): Promise<Hunalign> {
    const hunalign = await HunalignLib.Hunalign.create(hunalignWasm);
    return new Hunalign(hunalign);
  }
}

function textifySplitParagraphs(split: string[][]): string {
  return split
    .map((splitParagraph) => splitParagraph.join("\n"))
    .join(`\n${PARAGRAPH_MARKER}\n`);
}
