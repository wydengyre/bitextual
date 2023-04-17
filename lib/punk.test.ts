import { Punkt } from "./punkt.ts";
import { readFixtureString } from "../test/util.ts";
import * as path from "std/path/mod.ts";
import { fromFileUrl } from "std/path/mod.ts";
import englishSentences from "../test/bovary.english.sentences.json" assert {
  type: "json",
};
import frenchSentences from "../test/bovary.french.sentences.json" assert {
  type: "json",
};
import { assertEquals } from "std/testing/asserts.ts";

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
  const sents = punkt.sentences(trainingData, chapterSplit);
  assertEquals(sents, englishSentences);
});

Deno.test("tokenizes french sentences", async () => {
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
  const sents = punkt.sentences(trainingData, chapterSplit);
  assertEquals(sents, frenchSentences);
});
