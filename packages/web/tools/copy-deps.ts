import { cpSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hunalignWasmPath = fileURLToPath(
	import.meta.resolve("@bitextual/hunalign/hunalign.wasm"),
);

const dictionariesPath = dirname(
	fileURLToPath(import.meta.resolve("@bitextual/core/dictionaries")),
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageDir = dirname(__dirname);
const distDir = join(packageDir, "dist");
const hunalignWasmDest = join(distDir, "hunalign.wasm");
const dictionaryDir = join(distDir, "dictionaries");

cpSync(hunalignWasmPath, hunalignWasmDest);
for (const { parentPath, name } of readdirSync(dictionariesPath, {
	withFileTypes: true,
})) {
	const dictPath = join(parentPath, name);
	const dictDest = join(dictionaryDir, name);
	cpSync(dictPath, dictDest);
}
