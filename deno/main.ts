import { isLanguage } from "../lib/types.ts";
import { renderAlignment } from "./pipeline.ts";

const USAGE = "[sourcelang] [targetlang] [sourcetext] [targettext]";
const EXAMPLE =
  "deno run --allow-read=. deno/main.ts en it test/goosebumps.chapter.txt test/goosebumps.capitolo.txt";

async function main() {
  const [sourceLang, targetLang, sourceTextPath, targetTextPath] = Deno.args;

  if (!isLanguage(sourceLang)) {
    console.error(`Invalid source language: ${sourceLang}`);
    console.error(USAGE);
    console.error(EXAMPLE);
    Deno.exit(1);
  }

  if (!isLanguage(targetLang)) {
    console.error(`Invalid target language: ${targetLang}`);
    console.error(USAGE);
    console.error(EXAMPLE);
    Deno.exit(1);
  }

  const [sourceText, targetText] = await Promise.all([
    Deno.readTextFile(sourceTextPath),
    Deno.readTextFile(targetTextPath),
  ]);

  const rendered = await renderAlignment([sourceLang, sourceText], [
    targetLang,
    targetText,
  ]);
  console.log(rendered);
}

if (import.meta.main) {
  await main();
}
