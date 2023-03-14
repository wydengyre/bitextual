import { Punkt } from "./punkt.ts";
import { readFixtureString } from "../test/util.ts";
import * as path from "std/path/mod.ts";
import { fromFileUrl } from "std/path/mod.ts";

const TRAINING_DATA_PATH = fromFileUrl(
  import.meta.resolve("../resources/punkt/data"),
);

Deno.test("tokenizes english sentences", async () => {
  // const expectedSentencesStr = await readFixtureString("chapter.sentences.txt");
  // const expectedSentences = expectedSentencesStr.split("\n");

  const chapterPromise = readFixtureString("chapter.txt");
  const trainingDataPromise = Deno.readFile(
    path.join(TRAINING_DATA_PATH, "english.json"),
  );

  const [chapter, trainingData] = await Promise.all([
    chapterPromise,
    trainingDataPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create();
  const sents = punkt.sentences(trainingData, chapterSplit);
  console.log(sents);
  // assertEquals(sents, expectedSentences);
});

Deno.test("tokenizes french sentences", async () => {
  // const expectedSentencesStr = await readFixtureString(
  //   "chapitre.sentences.txt",
  // );
  // const expectedSentences = expectedSentencesStr.split("\n");
  //
  const chapterPromise = readFixtureString("chapitre.txt");
  const trainingDataPromise = Deno.readFile(
    path.join(TRAINING_DATA_PATH, "french.json"),
  );

  const [chapter, trainingData] = await Promise.all([
    chapterPromise,
    trainingDataPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create();
  const sents = punkt.sentences(trainingData, chapterSplit);
  console.log(sents);
  // assertEquals(sents, expectedSentences);
});
