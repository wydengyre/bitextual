import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFixtureString } from "@bitextual/test/util.js";
import { go } from "./main.js";

test("run main", async () => {
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
	const expected = await readFixtureString("bovary.aligned.html");
	assert.strictEqual(result, expected.trim());
});

test("run main with language detection", async () => {
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.edited.txt"),
	);
	const result = await go([bovaryFrench, bovaryEnglish]);
	const expected = await readFixtureString("bovary.aligned.html");
	assert.strictEqual(result, expected.trim());
});

test("run main with languages that have no dictionaries", async () => {
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
});
