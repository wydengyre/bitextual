import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AlignmentConfig, align } from "@bitextual/core/align.js";
import {
	detectLang,
	isUnsupportedLanguage,
} from "@bitextual/core/detect-lang.js";
import {
	Language,
	isLanguage,
	language,
	languageCodes,
} from "@bitextual/core/language.js";
import * as HunalignLib from "@bitextual/hunalign/hunalign.js";

export { go };

const USAGE = "([sourcelang] [targetlang]) [sourcetext] [targettext]";
const EXAMPLE =
	"deno run --allow-read deno/main.ts test/bovary.french.edited.txt test/bovary.english.edited.txt > test/bovary.aligned.html";

const PUNKT_WASM_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/punkt/punkt_bg.wasm"),
);
const HUNALIGN_WASM_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/hunalign/hunalign.wasm"),
);

async function main() {
	const out = await go(process.argv);
	console.log(out);
}

function go(args: string[]): Promise<string> {
	if (args.length === 2) {
		return goDetectingLanguages(args[0] as string, args[1] as string);
	}
	if (args.length === 4) {
		const [cmdSourceLang, cmdTargetLang, sourceTextPath, targetTextPath] =
			args as [string, string, string, string];
		if (!isLanguage(cmdSourceLang)) {
			console.error(`Invalid source language: ${cmdSourceLang}`);
			console.error(USAGE);
			console.error(EXAMPLE);
			process.exit(1);
		}

		if (!isLanguage(cmdTargetLang)) {
			console.error(`Invalid target language: ${cmdTargetLang}`);
			console.error(USAGE);
			console.error(EXAMPLE);
			process.exit(1);
		}
		return goProvidingLanguages(
			cmdSourceLang,
			cmdTargetLang,
			sourceTextPath,
			targetTextPath,
		);
	}

	throw "Invalid number of arguments";
}

export async function goDetectingLanguages(
	sourcePath: string,
	targetPath: string,
): Promise<string> {
	const sourceText = await readFile(sourcePath, "utf-8");
	const detectedSourceLang = detectLang(sourceText);
	if (isUnsupportedLanguage(detectedSourceLang)) {
		console.error(`Unsupported source language: ${detectedSourceLang[1]}`);
		console.error(USAGE);
		console.error(EXAMPLE);
		process.exit(1);
	}
	console.error(`Detected source language: ${capitalize(detectedSourceLang)}`);
	const sourceLang = language[detectedSourceLang];

	const targetText = await readFile(targetPath, "utf-8");
	const detectedTargetLang = detectLang(targetText);
	if (isUnsupportedLanguage(detectedTargetLang)) {
		console.error(`Unsupported target language: ${detectedTargetLang[1]}`);
		console.error(USAGE);
		console.error(EXAMPLE);
		process.exit(1);
	}
	console.error(`Detected target language: ${capitalize(detectedTargetLang)}`);
	const targetLang = language[detectedTargetLang];

	return goWithLanguagesAndText(sourceLang, targetLang, sourceText, targetText);
}

export async function goProvidingLanguages(
	sourceLang: Language,
	targetLang: Language,
	sourceTextPath: string,
	targetTextPath: string,
): Promise<string> {
	const sourceText = await readFile(sourceTextPath, "utf-8");
	const targetText = await readFile(targetTextPath, "utf-8");

	return goWithLanguagesAndText(sourceLang, targetLang, sourceText, targetText);
}

async function goWithLanguagesAndText(
	sourceLangAbbr: Language,
	targetLangAbbr: Language,
	sourceText: string,
	targetText: string,
) {
	const [punktWasm, hunalignWasm] = await Promise.all([
		readFile(PUNKT_WASM_PATH),
		readFile(HUNALIGN_WASM_PATH),
	]);
	const hunalignLib = await HunalignLib.Hunalign.create(hunalignWasm);

	const [punktSourceTrainingData, punktTargetTrainingData] = await Promise.all([
		getTrainingData(sourceLangAbbr),
		getTrainingData(targetLangAbbr),
	]);

	const hunalignDictData = await readFile(
		fileURLToPath(
			import.meta.resolve(
				`@bitextual/hunalign/dictionaries/${targetLangAbbr}-${sourceLangAbbr}.dic`,
			),
		),
	);

	const sourceLang = languageCodes.get(sourceLangAbbr);
	if (sourceLang === undefined) {
		throw new Error(`Invalid language: ${sourceLangAbbr}`);
	}
	const targetLang = languageCodes.get(targetLangAbbr);
	if (targetLang === undefined) {
		throw new Error(`Invalid language: ${targetLangAbbr}`);
	}
	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		punktWasm,
		punktSourceTrainingData,
		punktTargetTrainingData,
		hunalignLib,
		hunalignDictData,
	};

	return align(sourceText, targetText, alignConfig);
}

function getTrainingData(l: Language): Promise<Uint8Array> {
	const languageName = languageCodes.get(l);
	if (languageName === undefined) {
		throw new Error(`Invalid language: ${l}`);
	}
	const languageFileName = `${languageName}.json`;
	const languagePath = fileURLToPath(
		import.meta.resolve(`@bitextual/punkt/data/${languageFileName}`),
	);

	return readFile(languagePath);
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
