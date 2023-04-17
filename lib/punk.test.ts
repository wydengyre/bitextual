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
const ENGLISH_TRAINING_DATA_PATH = path.join(
  TRAINING_DATA_PATH,
  "english.json",
);
const FRENCH_TRAINING_DATA_PATH = path.join(TRAINING_DATA_PATH, "french.json");

Deno.test("tokenizes english sentences", async () => {
  // const expectedSentencesStr = await readFixtureString("chapter.sentences.txt");
  // const expectedSentences = expectedSentencesStr.split("\n");

  const englishPromise = readFixtureString("bovary.english.edited.txt");
  const trainingDataPromise = Deno.readFile(ENGLISH_TRAINING_DATA_PATH);
  const punktWasmPromise = Deno.readFile(PUNKT_WASM_PATH);

  const [chapter, trainingData, punktWasm] = await Promise.all([
    englishPromise,
    trainingDataPromise,
    punktWasmPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create(punktWasm);
  const _sents = punkt.sentences(trainingData, chapterSplit);
  // assertEquals(sents, expectedSentences);
});

Deno.test("tokenizes french sentences", async () => {
  // const expectedSentencesStr = await readFixtureString(
  //   "chapitre.sentences.txt",
  // );
  // const expectedSentences = expectedSentencesStr.split("\n");
  //
  const frenchPromise = readFixtureString("bovary.french.edited.txt");
  const trainingDataPromise = Deno.readFile(FRENCH_TRAINING_DATA_PATH);
  const punktWasmPromise = Deno.readFile(PUNKT_WASM_PATH);

  const [chapter, trainingData, punktWasm] = await Promise.all([
    frenchPromise,
    trainingDataPromise,
    punktWasmPromise,
  ]);
  const chapterSplit = chapter.split("\n");
  const punkt = await Punkt.create(punktWasm);
  const _sents = punkt.sentences(trainingData, chapterSplit);
  // assertEquals(sents, expectedSentences);
});
