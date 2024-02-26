import { copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CSS_FILENAME = "pico.min.css";
const CSS_PATH = fileURLToPath(
	import.meta.resolve(`@picocss/pico/css/${CSS_FILENAME}`),
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TARGET_PATH = `${dirname(__dirname)}/dist/${CSS_FILENAME}`;

function main() {
	copyFileSync(CSS_PATH, TARGET_PATH);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	main();
}
