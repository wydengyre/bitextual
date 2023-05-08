import { readAll } from "std/streams/read_all.ts";
import { epubToText } from "./epub.ts";

const _EXAMPLE =
  "cat test/bovary.english.epub | deno run deno/epub-to-text.ts | test/bovary.english.edited.txt";

async function main() {
  const out = await go(Deno.stdin);
  console.log(out);
}

export async function go(r: Deno.Reader): Promise<string> {
  const input = await readAll(r);
  return epubToText(input);
}

if (import.meta.main) {
  await main();
}
