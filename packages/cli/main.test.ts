import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFixtureString } from "@bitextual/test/util.js";
import { go } from "./main.js";

test("main", async (t) => {
	const bovaryAligned = (
		await readFixtureString("bovary.aligned.cli.html")
	).trim();

	await Promise.all([
		t.test("test main", testMain(bovaryAligned)),
		t.test(
			"test main with language detection",
			testMainWithLanguageDetection(bovaryAligned),
		),
		t.test(testMainWithNoDictionary),
	]);
});

const testMain = (expected: string) => async () => {
	const sourceLang = "fra";
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const targetLang = "eng";
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.edited.txt"),
	);
	const result = await go([
		sourceLang,
		targetLang,
		bovaryFrench,
		bovaryEnglish,
	]);
	assert.strictEqual(result, expected);
};

const testMainWithLanguageDetection = (expected: string) => async () => {
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.edited.txt"),
	);
	const result = await go([bovaryFrench, bovaryEnglish]);
	assert.strictEqual(result, expected);
};

const testMainWithNoDictionary = async () => {
	// we'll just use bovary, but specify nonsense languages on the command line
	const sourceLang = "xxx";
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const targetLang = "zzz";
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.edited.txt"),
	);

	// if this doesn't throw, we're happy
	await go([sourceLang, targetLang, bovaryFrench, bovaryEnglish]);
};
