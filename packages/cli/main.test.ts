import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFixtureString } from "@bitextual/test/util.js";
import { go } from "./main.js";

test("run main", async () => {
	const sourceLang = "fr";
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const targetLang = "en";
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
