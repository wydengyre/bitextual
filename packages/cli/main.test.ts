import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixturePath } from "@bitextual/test/util.js";
import beautify from "js-beautify";
import { go } from "./main.js";

test("main", async (t) => {
	await t.test(testMain);
});

async function testMain() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const alignedPath = join(__dirname, "test", "bovary.aligned.cli.html");
	const expected = await readFile(alignedPath, "utf-8");

	const bovaryFrench = fixturePath("bovary.french.epub");
	const bovaryEnglish = fixturePath("bovary.english.epub");
	const result = await go(["--html", bovaryFrench, bovaryEnglish]);
	const resultText = new TextDecoder().decode(result);

	// beautification simplifies diff
	const resultBeautified = beautify.html(resultText);
	const expectedBeautified = beautify.html(expected);
	assert.strictEqual(resultBeautified, expectedBeautified);
}
