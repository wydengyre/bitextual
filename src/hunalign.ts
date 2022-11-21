import { resourcePath } from "./resources.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { spawnText } from "./utils.ts";
import { Symbol } from "https://deno.land/x/ts_morph@13.0.2/ts_morph.js";

export type Ladder = Rung[];
export type SourceIndex = number;
export type TargetIndex = number;
export type Confidence = number;
export type Rung = [SourceIndex, TargetIndex, Confidence];

const HUNALIGN_BIN_PATH = resourcePath("hunalign");

export const PARAGRAPH_MARKER = "<p>";

async function main() {
  // TODO: bring this back
  // const aligned = await hunalign();
  // console.log(aligned);
}

export async function align(
  frenchSplitParagraphs: string[][],
  englishSplitParagraphs: string[][],
): Promise<[string[], string[]][]> {
  const frenchText = textifySplitParagraphs(frenchSplitParagraphs);
  const englishText = textifySplitParagraphs(englishSplitParagraphs);

  const dictPath = resourcePath("hunapertium-eng-fra.dic");

  const [frenchTextPath, englishTextPath] = await Promise.all([
    Deno.makeTempFile(),
    Deno.makeTempFile(),
  ]);
  await Promise.all([
    Deno.writeTextFile(frenchTextPath, frenchText),
    Deno.writeTextFile(englishTextPath, englishText),
  ]);

  const ladder = await hunalign(dictPath, frenchTextPath, englishTextPath);

  const frenchLines = frenchText.split("\n");
  const englishLines = englishText.split("\n");
  const matches: [string[], string[]][] = [];
  for (let i = 0, l = 0, r = 0; i < ladder.length; i++) {
    const [lPrime, rPrime] = ladder[i];

    const leftLines: string[] = [];
    for (; l <= lPrime; l++) {
      leftLines.push(frenchLines[l]);
    }

    const rightLines: string[] = [];
    for (; r <= rPrime; r++) {
      rightLines.push(englishLines[r]);
    }

    matches.push([leftLines, rightLines]);
  }
  return matches;
}

function textifySplitParagraphs(split: string[][]): string {
  return split
    .map((splitParagraph) => splitParagraph.join("\n"))
    .join(`\n${PARAGRAPH_MARKER}\n`);
}

export async function hunalign(
  dictPath: string,
  frenchPath: string,
  englishPath: string,
): Promise<Ladder> {
  const { out } = await spawnText(HUNALIGN_BIN_PATH, {
    args: [
      // enabling the option below switches to text format (from ladder)
      // "-text",
      // see command documentation for thresholds
      // "-thresh=5",
      // "-ppthresh=10",
      // "-headerthresh=100",
      // "-topothresh=10",
      dictPath,
      frenchPath,
      englishPath,
    ],
  });
  return parseLadder(out);
}

function parseLadder(ladderStr: string): Ladder {
  const BASE_10 = 10;
  const intify = (s: string): number => parseInt(s, BASE_10);

  return ladderStr.split("\n")
    .map((rungStr) => rungStr.split("\t"))
    .map(([l, r, c]) => [intify(l), intify(r), intify(c)]);
}

if (import.meta.main) {
  await main();
}
