import { resourcePath } from "./resources.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { spawnText } from "./utils.ts";

const HUNALIGN_BIN_PATH = resourcePath("hunalign");

async function main() {
  const aligned = await hunalign();

  const outPath = fromFileUrl(
    import.meta.resolve("../test/chapteraligned.txt"),
  );
  await Deno.writeTextFile(outPath, aligned);
}

export async function hunalign(): Promise<string> {
  // TODO: ladder format support
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
      "-text",
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
  return out;
}

if (import.meta.main) {
  await main();
}
