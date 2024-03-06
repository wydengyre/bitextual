import { cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hunalignWasmPath = fileURLToPath(
	import.meta.resolve("@bitextual/hunalign/hunalign.wasm"),
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageDir = dirname(__dirname);
const hunalignWasmDest = join(packageDir, "dist", "hunalign.wasm");

cpSync(hunalignWasmPath, hunalignWasmDest);
