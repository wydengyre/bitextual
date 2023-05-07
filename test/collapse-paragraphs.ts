import { readAll } from "std/streams/mod.ts";
import { processLineBreaks } from "../lib/epub.ts";

// working with Deno 1.32.2

async function main() {
  const input = await readAll(Deno.stdin);
  const text = new TextDecoder().decode(input);
  const processedText = processLineBreaks(text);
  console.log(processedText);
}

if (import.meta.main) {
  await main();
}
