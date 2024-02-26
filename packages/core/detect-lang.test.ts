import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	detectLang,
	isUnsupportedLanguage,
	unsupportedLanguage,
} from "./detect-lang.js";
import { LanguageName } from "./language.js";

test("detects English", () => {
	const sample = "This is a sample text in English.";
	testDetection(sample, "english");
});

test("detects French", () => {
	const sample = "Ceci est un texte d'échantillon en français.";
	testDetection(sample, "french");
});

test("detects Italian", () => {
	const sample = "Questo è un testo di esempio in italiano.";
	testDetection(sample, "italian");
});

test("detects Spanish", () => {
	const sample = "Este es un texto de ejemplo en español.";
	testDetection(sample, "spanish");
});

test("detects unsupported language", () => {
	const sample = "滚滚长江东逝水";
	const detected = detectLang(sample);
	assert.deepStrictEqual(detected, unsupportedLanguage("und"));
	assert.strict(isUnsupportedLanguage(detected));
});

function testDetection(text: string, expected: LanguageName) {
	const detected = detectLang(text);
	assert.strictEqual(detected, expected);
	assert.strict(!isUnsupportedLanguage(detected));
}
