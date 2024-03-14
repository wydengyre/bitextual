import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFixtureString } from "@bitextual/test/util.js";
import { go } from "./main.js";

test("main", async (t) => {
	const bovaryAligned = (
		await readFixtureString("bovary.aligned.cli.html")
	).trim();

	await Promise.all([t.test("test main", testMain(bovaryAligned))]);
});

const testMain = (expected: string) => async () => {
	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.edited.txt"),
	);
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.edited.txt"),
	);
	const result = await go(["--html", bovaryFrench, bovaryEnglish]);
	const resultText = new TextDecoder().decode(result);
	assert.strictEqual(resultText, expected);
};
