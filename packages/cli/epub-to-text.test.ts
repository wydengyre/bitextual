import { strict as assert } from "node:assert";
import { open, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { go } from "./epub-to-text.js";

test("epub-to-text.ts", async (t) => {
	const expected = await readFile(EPUB_TEXT_PATH, "utf-8");

	await Promise.all([
		t.test("epubToText on epub 2", epub2(expected)),
		t.test("epubToText on epub 3", epub3(expected)),
	]);
});

const EPUB2_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.epub"),
);
const EPUB_TEXT_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.epub.txt"),
);

const EPUB3_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.images.epub"),
);

const epub2 = (expected: string) => async () => {
	await using fStream = await open(EPUB2_PATH);
	const text = await go(fStream.createReadStream());
	assert.strictEqual(text, expected);
};

const epub3 = (expected: string) => async () => {
	await using fStream = await open(EPUB3_PATH);
	const text = await go(fStream.createReadStream());
	assert.strictEqual(text, expected);
};
