import { fromFileUrl } from "std/path/mod.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";
import { go } from "./epub-to-text.ts";
import { Buffer } from "std/io/buffer.ts";

const EPUB2_PATH_REL = "../test/bovary.english.epub";
const EPUB2_PATH = fromFileUrl(import.meta.resolve(EPUB2_PATH_REL));
const EPUB_TEXT_REL = "../test/bovary.english.epub.txt";
const EPUB_TEXT_PATH = fromFileUrl(import.meta.resolve(EPUB_TEXT_REL));

const EPUB3_PATH_REL = "../test/bovary.english.images.epub";
const EPUB3_PATH = fromFileUrl(import.meta.resolve(EPUB3_PATH_REL));

const SAMPLE_EPUB_PATH_REL = "../submodules/epub3-samples/30";
const SAMPLE_EPUB_PATH = fromFileUrl(import.meta.resolve(SAMPLE_EPUB_PATH_REL));

Deno.test("epubToText on epub 2", async () => {
  const bytes = await Deno.readFile(EPUB2_PATH);
  const buffer = new Buffer(bytes);
  const expected = await Deno.readTextFile(EPUB_TEXT_PATH);
  const text = await go(buffer);
  assertStrictEquals(text, expected);
});

Deno.test("epubToText on epub 3", async () => {
  const bytes = await Deno.readFile(EPUB3_PATH);
  const buffer = new Buffer(bytes);
  const expected = await Deno.readTextFile(EPUB_TEXT_PATH);
  const text = await go(buffer);
  assertStrictEquals(text, expected);
});

// Note that this test is a noop unless you have the epub3-samples submodule
// checked out, and run
Deno.test("check decoding of sample epubs", async () => {
  try {
    await Deno.stat(SAMPLE_EPUB_PATH);
  } catch {
    console.log(
      "Skipping test because epub3-samples submodule is not checked out",
    );
    return;
  }

  const dir = Deno.readDir(SAMPLE_EPUB_PATH);
  for await (const entry of dir) {
    if (entry.isFile && entry.name.endsWith(".epub")) {
      const bytes = await Deno.readFile(EPUB3_PATH);
      const buffer = new Buffer(bytes);
      await go(buffer);
    }
  }
});
