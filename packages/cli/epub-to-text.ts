import type { Readable } from "node:stream";
import { arrayBuffer } from "node:stream/consumers";
import { fileURLToPath } from "node:url";
import { epubToText } from "@bitextual/epub/epub.js";

export { go };

async function main() {
	const out = await go(process.stdin);
	console.log(out);
}

async function go(r: Readable): Promise<string> {
	const ab = await arrayBuffer(r);
	return epubToText(ab);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
