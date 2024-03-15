import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { go } from "./main.js";

test("main", async (t) => {
	await t.test(testMain);
});

async function testMain() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const alignedPath = join(__dirname, "test", "bovary.aligned.cli.html");
	const expected = await readFile(alignedPath, "utf-8");

	const bovaryFrench = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.french.epub"),
	);
	const bovaryEnglish = fileURLToPath(
		import.meta.resolve("@bitextual/test/bovary.english.epub"),
	);
	const result = await go(["--html", bovaryFrench, bovaryEnglish]);
	const resultText = new TextDecoder().decode(result);
	assert.strictEqual(resultText, expected);
}
