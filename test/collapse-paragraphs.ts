import { readAll } from "https://deno.land/std@0.182.0/streams/mod.ts";

// working with Deno 1.32.2

async function main() {
  const input = await readAll(Deno.stdin);
  const text = new TextDecoder().decode(input);
  const processedText = processLineBreaks(text);
  console.log(processedText);
}

function processLineBreaks(text: string): string {
  const normalizedText = text.replace(/\r\n/g, "\n");
  const collapsedParagraphs = normalizedText.replace(/(?<!\n)\n(?!\n)/g, " ");
  return collapsedParagraphs.replace(/\n+/g, "\n");
}

if (import.meta.main) {
  await main();
}
