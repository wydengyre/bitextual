import { fromFileUrl } from "std/path/mod.ts";
import { epubToText } from "./epub.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";

const EPUB2_PATH_REL = "../test/bovary.english.epub";
const EPUB2_PATH = fromFileUrl(import.meta.resolve(EPUB2_PATH_REL));
const EPUB_TEXT_REL = "../test/bovary.english.epub.txt";
const EPUB_TEXT_PATH = fromFileUrl(import.meta.resolve(EPUB_TEXT_REL));

const EPUB3_PATH_REL = "../test/bovary.english.images.epub";
const EPUB3_PATH = fromFileUrl(import.meta.resolve(EPUB3_PATH_REL));

Deno.test("epubToText on epub 2", async () => {
  const bytes = await Deno.readFile(EPUB2_PATH);
  const expected = await Deno.readTextFile(EPUB_TEXT_PATH);
  const text = await epubToText(bytes);
  assertStrictEquals(text, expected);
});

Deno.test("epubToText on epub 3", async () => {
  const bytes = await Deno.readFile(EPUB3_PATH);
  const expected = await Deno.readTextFile(EPUB_TEXT_PATH);
  const text = await epubToText(bytes);
  assertStrictEquals(text, expected);
});
