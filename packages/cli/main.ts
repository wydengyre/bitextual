import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type AlignmentConfig, align } from "@bitextual/core/align.js";
import { franc } from "franc-min";
import pkg from "./package.json" with { type: "json" };

export { go };

async function main() {
	const out = await go(process.argv.slice(2));
	console.log(out);
}

function go(args: string[]): Promise<string> {
	if (args.length === 2) {
		return goDetectingLanguages(args[0] as string, args[1] as string);
	}
	throw "Invalid number of arguments";
}

export async function goDetectingLanguages(
	sourcePath: string,
	targetPath: string,
): Promise<string> {
	const sourceText = await readFile(sourcePath, "utf-8");
	const sourceLang = franc(sourceText);
	console.error(`Detected source language: ${sourceLang}`);

	const targetText = await readFile(targetPath, "utf-8");
	const targetLang = franc(targetText);

	return goWithLanguagesAndText(sourceLang, targetLang, sourceText, targetText);
}

async function goWithLanguagesAndText(
	sourceLang: string,
	targetLang: string,
	sourceText: string,
	targetText: string,
) {
	const dictPath = fileURLToPath(
		import.meta.resolve(
			`@bitextual/core/dictionaries/${targetLang}-${sourceLang}.dic`,
		),
	);

	const hunalignDictData: Buffer = await (async () => {
		try {
			return await readFile(dictPath);
		} catch (e) {
			console.error(`No dictionary found for ${sourceLang}-${targetLang}`);
			return Buffer.from([]);
		}
	})();

	const version = `${pkg.name}@${pkg.version}`;
	const meta = new Map([["version", version]]);

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
		meta,
	};

	return align(sourceText, targetText, alignConfig);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
