import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import englishSentences from "@bitextual/test/bovary.english.sentences.json" with {
	type: "json",
};
import frenchSentences from "@bitextual/test/bovary.french.sentences.json" with {
	type: "json",
};
import { readFixtureString } from "@bitextual/test/util.js";
import { Punkt } from "./punkt.js";

const PUNKT_WASM_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/punkt/punkt_bg.wasm"),
);

const ENGLISH_TRAINING_DATA_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/punkt/data/english.json"),
);
const FRENCH_TRAINING_DATA_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/punkt/data/french.json"),
);

test("tokenizes english sentences", async () => {
	const englishPromise = readFixtureString("bovary.english.edited.txt");
	const trainingDataPromise = await readFile(ENGLISH_TRAINING_DATA_PATH);
	const punktWasmPromise = await readFile(PUNKT_WASM_PATH);

	const [chapter, trainingData, punktWasm] = await Promise.all([
		englishPromise,
		trainingDataPromise,
		punktWasmPromise,
	]);
	const chapterSplit = chapter.split("\n");
	const punkt = await Punkt.create(punktWasm);
	const sents = punkt.sentences(trainingData, chapterSplit);
	assert.deepStrictEqual(sents, englishSentences);
});

test("tokenizes french sentences", async () => {
	const frenchPromise = readFixtureString("bovary.french.edited.txt");
	const trainingDataPromise = await readFile(FRENCH_TRAINING_DATA_PATH);
	const punktWasmPromise = await readFile(PUNKT_WASM_PATH);

	const [chapter, trainingData, punktWasm] = await Promise.all([
		frenchPromise,
		trainingDataPromise,
		punktWasmPromise,
	]);
	const chapterSplit = chapter.split("\n");
	const punkt = await Punkt.create(punktWasm);
	const sents = punkt.sentences(trainingData, chapterSplit);
	assert.deepStrictEqual(sents, frenchSentences);
});
