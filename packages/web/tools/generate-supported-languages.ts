import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_PATH_REL = "../build/supported-languages.json";
const OUT_PATH = fileURLToPath(import.meta.resolve(OUT_PATH_REL));

const DICTIONARIES_PATH = dirname(
	fileURLToPath(import.meta.resolve("@bitextual/hunalign/dictionaries")),
);

async function main() {
	const dictFiles = await readdir(DICTIONARIES_PATH, { withFileTypes: true });

	const supportedLanguages = dictFiles
		.filter((entry) => entry.isFile())
		.map((entry) => (entry.name.split(".")[0] as string).split("-"))
		.map(([target, source]) => [source, target]);
	supportedLanguages.sort();

	const supportedLanguagesJson = JSON.stringify(supportedLanguages, null, 2);
	const dir = dirname(OUT_PATH);
	await mkdir(dir, { recursive: true });
	await writeFile(OUT_PATH, supportedLanguagesJson, "utf-8");
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
