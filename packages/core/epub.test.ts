import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { epubToText } from "./epub.js";

const EPUB2_PATH_REL = "@bitextual/test/bovary.english.epub";
const EPUB2_PATH = fileURLToPath(import.meta.resolve(EPUB2_PATH_REL));
const EPUB_TEXT_REL = "@bitextual/test/bovary.english.epub.txt";
const EPUB_TEXT_PATH = fileURLToPath(import.meta.resolve(EPUB_TEXT_REL));

const EPUB3_PATH_REL = "@bitextual/test/bovary.english.images.epub";
const EPUB3_PATH = fileURLToPath(import.meta.resolve(EPUB3_PATH_REL));

test("epubToText on epub 2", async () => {
	const bytes = await readFile(EPUB2_PATH);
	const expected = await readFile(EPUB_TEXT_PATH, "utf-8");
	const text = await epubToText(bytes);
	assert.strictEqual(text, expected);
});

test("epubToText on epub 3", async () => {
	const bytes = await readFile(EPUB3_PATH);
	const expected = await readFile(EPUB_TEXT_PATH, "utf-8");
	const text = await epubToText(bytes);
	assert.strictEqual(text, expected);
});
