import { isLanguage, Language, languageCodes } from "../lib/types.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { align, AlignmentConfig } from "../lib/align.ts";

const USAGE = "[sourcelang] [targetlang] [sourcetext] [targettext]";
const EXAMPLE =
  "deno run --allow-read=. deno/main.ts en it test/goosebumps.chapter.txt test/goosebumps.capitolo.txt";

const PUNKT_WASM_PATH = fromFileUrl(
  import.meta.resolve("../resources/punkt/punkt_bg.wasm"),
);
const HUNALIGN_WASM_PATH = fromFileUrl(
  import.meta.resolve("../resources/hunalign/web/hunalign.wasm"),
);

async function main() {
  const out = await go(Deno.args);
  console.log(out);
}

export async function go(
  [sourceLang, targetLang, sourceTextPath, targetTextPath]: string[],
): Promise<string> {
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

  const [punktWasm, hunalignWasm] = await Promise.all([
    Deno.readFile(PUNKT_WASM_PATH),
    Deno.readFile(HUNALIGN_WASM_PATH),
  ]);

  const [sourceText, targetText] = await Promise.all([
    Deno.readTextFile(sourceTextPath),
    Deno.readTextFile(targetTextPath),
  ]);

  const [punktSourceTrainingData, punktTargetTrainingData] = await Promise.all([
    getTrainingData(sourceLang),
    getTrainingData(targetLang),
  ]);

  const hunalignDictData = await Deno.readFile(fromFileUrl(import.meta.resolve(
    `../resources/hunalign/dictionaries/${targetLang}-${sourceLang}.dic`,
  )));

  const alignConfig: AlignmentConfig = {
    sourceLanguage: languageCodes.get(sourceLang)!,
    targetLanguage: languageCodes.get(targetLang)!,
    punktWasm,
    punktSourceTrainingData,
    punktTargetTrainingData,
    hunalignWasm,
    hunalignDictData,
  };

  return align(sourceText, targetText, alignConfig);
}

function getTrainingData(l: Language): Promise<Uint8Array> {
  const languageName = languageCodes.get(l)!;
  const languageFileName = `${languageName}.json`;
  const languagePath = fromFileUrl(import.meta.resolve(
    `../resources/punkt/data/${languageFileName}`,
  ));

  return Deno.readFile(languagePath);
}

if (import.meta.main) {
  await main();
}
