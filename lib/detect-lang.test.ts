import { LanguageName } from "./types.ts";
import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "std/testing/asserts.ts";
import {
  detectLang,
  isUnsupportedLanguage,
  unsupportedLanguage,
} from "./detect-lang.ts";

Deno.test("detects English", () => {
  const sample = "This is a sample text in English.";
  testDetection(sample, "english");
});

Deno.test("detects French", () => {
  const sample = "Ceci est un texte d'échantillon en français.";
  testDetection(sample, "french");
});

Deno.test("detects Italian", () => {
  const sample = "Questo è un testo di esempio in italiano.";
  testDetection(sample, "italian");
});

Deno.test("detects Spanish", () => {
  const sample = "Este es un texto de ejemplo en español.";
  testDetection(sample, "spanish");
});

Deno.test("detects unsupported language", () => {
  const sample = "滚滚长江东逝水";
  const detected = detectLang(sample);
  assertEquals(detected, unsupportedLanguage("und"));
  assert(isUnsupportedLanguage(detected));
});

function testDetection(text: string, expected: LanguageName) {
  const detected = detectLang(text);
  assertStrictEquals(detected, expected);
  assert(!isUnsupportedLanguage(detected));
}
