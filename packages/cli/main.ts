import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type AlignmentConfig, alignTexts } from "@bitextual/core/align.ts";
import { epubToText } from "@bitextual/core/epub.ts";
import { franc } from "franc-min";
import pkg from "./package.json" with { type: "json" };

export { go };

async function main() {
	const out = await go(process.argv.slice(2));
	process.stdout.write(out);
}

async function go(args: string[]): Promise<Uint8Array> {
	if (args.length !== 3) {
		throw new Error(`Invalid number of arguments: ${args.length}`);
	}

	// we used to support epub output, but it didn't work great
	// and was a maintenance burden
	const [outFormat, sourcePath, targetPath] = args as [string, string, string];
	if (outFormat === "--html") {
		const html = await goHtml(sourcePath, targetPath);
		return new TextEncoder().encode(html);
	}
	throw new Error(`Invalid output format: ${outFormat}`);
}

async function goHtml(sourcePath: string, targetPath: string) {
	const [sourceEpub, targetEpub] = await Promise.all([
		readFile(sourcePath),
		readFile(targetPath),
	]);
	const sourceArr = Uint8Array.from(sourceEpub).buffer;
	const targetArr = Uint8Array.from(targetEpub).buffer;
	const [sourceText, targetText] = await Promise.all([
		epubToText(sourceArr),
		epubToText(targetArr),
	]);

	const sourceLang = franc(sourceText.text);
	const targetLang = franc(targetText.text);

	const dictPath = fileURLToPath(
		import.meta.resolve(
			`@bitextual/core/dictionaries/${targetLang}-${sourceLang}.dic`,
		),
	);

	const hunalignDictData: Buffer = await (async () => {
		try {
			return await readFile(dictPath);
		} catch (_e) {
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

	return alignTexts(
		sourceText.title,
		sourceText.text,
		targetText.text,
		alignConfig,
	);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
