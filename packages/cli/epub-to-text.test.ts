import { strict as assert } from "node:assert";
import { open, opendir, readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { go } from "./epub-to-text.js";

const EPUB2_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.epub"),
);
const EPUB_TEXT_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.epub.txt"),
);

const EPUB3_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/test/bovary.english.images.epub"),
);

const SAMPLE_EPUB_PATH_REL = "../submodules/epub3-samples/30";
const SAMPLE_EPUB_PATH = fileURLToPath(
	import.meta.resolve(SAMPLE_EPUB_PATH_REL),
);

test("epubToText on epub 2", async () => {
	await using fStream = await open(EPUB2_PATH);
	const expected = await readFile(EPUB_TEXT_PATH, "utf-8");
	const text = await go(fStream.createReadStream());
	assert.strictEqual(text, expected);
});

test("epubToText on epub 3", async () => {
	await using fStream = await open(EPUB3_PATH);
	const expected = await readFile(EPUB_TEXT_PATH, "utf-8");
	const text = await go(fStream.createReadStream());
	assert.strictEqual(text, expected);
});

// Note that this test is a noop unless you have the epub3-samples submodule
// checked out, and run
test("check decoding of sample epubs", async () => {
	try {
		await stat(SAMPLE_EPUB_PATH);
	} catch {
		console.log(
			"Skipping test because epub3-samples submodule is not checked out",
		);
		return;
	}

	const dir = await opendir(SAMPLE_EPUB_PATH);
	for await (const entry of dir) {
		if (entry.isFile() && entry.name.endsWith(".epub")) {
			await using fStream = await open(EPUB3_PATH);
			await go(fStream.createReadStream());
		}
	}
});
