import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	type AlignmentConfig,
	alignParas,
	alignTexts,
} from "@bitextual/core/align.js";
import { epubParas, generateAlignedEpub } from "@bitextual/core/epub.js";
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
	const [outFormat, sourcePath, targetPath] = args as [string, string, string];
	if (outFormat === "--html") {
		const html = await goHtml(sourcePath, targetPath);
		return new TextEncoder().encode(html);
	}
	if (outFormat === "--epub") {
		return goEpub(sourcePath, targetPath);
	}
	throw new Error(`Invalid output format: ${outFormat}`);
}

async function goHtml(sourcePath: string, targetPath: string) {
	const sourceText = await readFile(sourcePath, "utf-8");
	const sourceLang = franc(sourceText);

	const targetText = await readFile(targetPath, "utf-8");
	const targetLang = franc(targetText);

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

	return alignTexts(sourceText, targetText, alignConfig);
}

async function goEpub(sourceEpubPath: string, targetEpubPath: string) {
	const [sourceEpub, targetEpub] = await Promise.all([
		readFile(sourceEpubPath),
		readFile(targetEpubPath),
	]);
	const [sourceParas, targetParas] = await Promise.all([
		toArray(epubParas(sourceEpub)),
		toArray(epubParas(targetEpub)),
	]);

	const sourceText = sourceParas.join("\n");
	const sourceLang = franc(sourceText);
	const targetText = targetParas.join("\n");
	const targetLang = franc(targetText);

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

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
	};

	const aligned = await alignParas(sourceParas, targetParas, alignConfig);
	const epub = await generateAlignedEpub(aligned, sourceEpub);
	return new Uint8Array(epub);
}

async function toArray<T>(asyncGen: AsyncGenerator<T>): Promise<T[]> {
	const res: T[] = [];
	for await (const item of asyncGen) {
		res.push(item);
	}
	return res;
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
