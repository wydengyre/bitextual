import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fixturePath, readFixtureString } from "@bitextual/test/util.js";
import { go } from "./main.js";

test("main", async (t) => {
	await t.test(testMain);
});

async function testMain() {
	const expected = await readFixtureString("bovary.aligned.html");

	const bovaryFrench = fixturePath("bovary.french.epub");
	const bovaryEnglish = fixturePath("bovary.english.epub");
	const result = await go(["--html", bovaryFrench, bovaryEnglish]);
	const resultText = new TextDecoder().decode(result);
	assert.strictEqual(resultText, expected);
}
