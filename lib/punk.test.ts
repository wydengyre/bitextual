import { Punkt } from "./punkt.ts";
import { readFixtureString } from "../test/util.ts";
import * as path from "std/path/mod.ts";
import { fromFileUrl } from "std/path/mod.ts";

const PUNKT_WASM_PATH = fromFileUrl(
  import.meta.resolve("../resources/punkt/punkt_bg.wasm"),
);

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
  const punktWasmPromise = Deno.readFile(PUNKT_WASM_PATH);

  const [chapter, trainingData, punktWasm] = await Promise.all([
    chapterPromise,
    trainingDataPromise,
    punktWasmPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create(punktWasm);
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
  const punktWasmPromise = Deno.readFile(PUNKT_WASM_PATH);

  const [chapter, trainingData, punktWasm] = await Promise.all([
    chapterPromise,
    trainingDataPromise,
    punktWasmPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create(punktWasm);
  const sents = punkt.sentences(trainingData, chapterSplit);
  console.log(sents);
  // assertEquals(sents, expectedSentences);
});
