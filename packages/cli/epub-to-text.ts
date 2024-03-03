import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { epubToText } from "@bitextual/epub/epub.js";
import { arrayBuffer } from "stream/consumers";

export { go };

async function main() {
	const out = await go(process.stdin);
	console.log(out);
}

async function go(r: Readable): Promise<string> {
	const ab = await arrayBuffer(r);
	const u8a = new Uint8Array(ab);
	return epubToText(u8a);
}

const currentFile = fileURLToPath(import.meta.url);
const isDirectlyExecuted = currentFile === process.argv[1];
if (isDirectlyExecuted) {
	await main();
}
