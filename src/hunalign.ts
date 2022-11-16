import { resourcePath } from "./resources.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { spawnText } from "./utils.ts";

export type Ladder = Rung[];
export type SourceIndex = number;
export type TargetIndex = number;
export type Confidence = number;
export type Rung = [SourceIndex, TargetIndex, Confidence];

const HUNALIGN_BIN_PATH = resourcePath("hunalign");

async function main() {
  const aligned = await hunalign();
  console.log(aligned);
}

export async function hunalign(): Promise<Ladder> {
  const dictPath = resourcePath("hunapertium-eng-fra.dic");
  const fraSentencesPath = fromFileUrl(
    import.meta.resolve("../test/chapitre.sentences.txt"),
  );
  const engSentencesPath = fromFileUrl(
    import.meta.resolve("../test/chapter.sentences.txt"),
  );
  // const fraSentencesPath = fromFileUrl(
  //   import.meta.resolve("../test/allfrench.sentences.txt"),
  // );
  // const engSentencesPath = fromFileUrl(
  //   import.meta.resolve("../test/allenglish.sentences.txt"),
  // );

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
      fraSentencesPath,
      engSentencesPath,
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
