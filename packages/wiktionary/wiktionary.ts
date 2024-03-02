import { open, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const DATA_REL = "./raw-wiktextract-data.json";
const LANGS = ["de", "en", "es", "fr", "it", "tr"];
type Lang = (typeof LANGS)[number];

const validWordRe = /^[\p{L}\p{N}']+$/u;

const translationSchema = z.object({
	// TODO: maybe only use one of lang or code
	code: z.string(),
	word: z.string(),
});

const formSchema = z.object({
	form: z.string(),
});

const dataSchema = z.object({
	// senses: z.array(senseSchema),
	// pos: z.string(),
	// head_templates: z.array(headTemplateSchema),
	forms: z.array(formSchema),
	translations: z.array(translationSchema),
	// etymology_text: z.string(),
	// etymology_templates: z.array(etymologyTemplateSchema),
	// sounds: z.array(soundSchema),
	word: z.string(),
	lang: z.string(),
	lang_code: z.string(),
});

// TODO: follow translations and _then_ spit out translations
// for all forms of the translation

const dataPath = fileURLToPath(import.meta.resolve(DATA_REL));
await using f = await open(dataPath);
const s = f.createReadStream({
	encoding: "utf-8",
	// Uncomment to cap data size. Useful for debugging.
	// end: 1_000_000_000
});

type Translations = Map<string, Set<string>>;
const dictionaries: Map<Lang, Map<Lang, Translations>> = new Map(
	LANGS.map((lang) => [
		lang,
		new Map(LANGS.filter((l) => l !== lang).map((l) => [l, new Map()])),
	]),
);
const lines = createInterface({ input: s });
console.log("reading wiktionary dump");
for await (const line of lines) {
	// quick check if line contains the word "translation"
	if (!line.includes("translation")) {
		continue;
	}

	let j: unknown;
	try {
		j = JSON.parse(line);
	} catch (e) {
		continue;
	}

	const parsed = dataSchema.safeParse(j);
	if (!parsed.success) {
		continue;
	}
	const { word, lang_code, translations, forms } = parsed.data;
	if (!dictionaries.has(lang_code)) {
		continue;
	}

	const langDict = dictionaries.get(lang_code) as Map<Lang, Translations>;
	for (const { code, word: transWord } of translations) {
		const translations = langDict.get(code);
		if (translations === undefined) {
			continue;
		}

		// add translation
		const wordTranslations = translations.get(word) || new Set();
		wordTranslations.add(transWord);
		translations.set(word, wordTranslations);
		for (const { form } of forms) {
			translations.set(form, wordTranslations);
		}

		// add reverse translation
		const reverseTranslations = (
			dictionaries.get(code) as Map<Lang, Translations>
		).get(lang_code) as Translations;
		const reverseWordTranslations =
			reverseTranslations.get(transWord) || new Set();
		reverseWordTranslations.add(word);
		for (const { form } of forms) {
			reverseWordTranslations.add(form);
		}
		reverseTranslations.set(transWord, reverseWordTranslations);
	}
}
console.log(
	`completed reading, creating dictionaries from ${
		dictionaries.size
	} languages (${dictionaries.size ** 2} total)`,
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dictDirPath = path.join(__dirname, "dictionaries");
for (const [sourceLang, langDict] of dictionaries) {
	console.log(`creating ${langDict.size} dictionaries from ${sourceLang}`);
	for (const [targetLang, translations] of langDict) {
		const filename = `${sourceLang}-${targetLang}.dic`;
		const p = path.join(dictDirPath, filename);
		console.log(`writing ${p}: ${translations.size} source words`);

		const content = Array.from(translations.entries())
			.toSorted()
			.flatMap(
				([word, transWords]) =>
					Array.from(transWords)
						.map((transWord) => [word, transWord])
						.toSorted() as [string, string][],
			)
			.filter(
				([word, transWord]) =>
					validWordRe.test(word) && validWordRe.test(transWord),
			)
			.map(([word, transWord]) => `${word} @ ${transWord}`)
			.join("\n");

		await writeFile(p, content);
	}
}
