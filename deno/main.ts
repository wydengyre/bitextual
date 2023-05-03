import * as HunalignLib from "../resources/hunalign/web/hunalign.js";
import { isLanguage, Language, language, languageCodes } from "../lib/types.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { align, AlignmentConfig } from "../lib/align.ts";
import { detectLang, isUnsupportedLanguage } from "../lib/detect-lang.ts";

const USAGE = "[sourcelang] [targetlang] [sourcetext] [targettext]";
const EXAMPLE =
  "deno run --allow-read deno/main.ts fr en test/bovary.french.edited.txt test/bovary.english.edited.txt > test/bovary.aligned.html";

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

export async function go(args: string[]): Promise<string> {
  let sourceLang: Language;
  let targetLang: Language;
  let sourceText: string;
  let targetText: string;
  if (args.length === 2) {
    const [sourceTextPath, targetTextPath] = args;
    sourceText = await Deno.readTextFile(sourceTextPath);

    const detectedSourceLang = detectLang(sourceText);
    if (isUnsupportedLanguage(detectedSourceLang)) {
      console.error(`Unsupported source language: ${detectedSourceLang[1]}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }
    sourceLang = language[detectedSourceLang];

    targetText = await Deno.readTextFile(targetTextPath);
    const detectedTargetLang = detectLang(targetText);
    if (isUnsupportedLanguage(detectedTargetLang)) {
      console.error(`Unsupported target language: ${detectedTargetLang[1]}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }
    targetLang = language[detectedTargetLang];
  } else if (args.length === 4) {
    const [cmdSourceLang, cmdTargetLang, sourceTextPath, targetTextPath] = args;
    if (!isLanguage(cmdSourceLang)) {
      console.error(`Invalid source language: ${cmdSourceLang}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }
    sourceLang = cmdSourceLang;

    if (!isLanguage(cmdTargetLang)) {
      console.error(`Invalid target language: ${cmdTargetLang}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }
    targetLang = cmdTargetLang;
    [sourceText, targetText] = await Promise.all([
      Deno.readTextFile(sourceTextPath),
      Deno.readTextFile(targetTextPath),
    ]);
  } else {
    throw "Invalid number of arguments";
  }

  const [punktWasm, hunalignWasm] = await Promise.all([
    Deno.readFile(PUNKT_WASM_PATH),
    Deno.readFile(HUNALIGN_WASM_PATH),
  ]);
  const hunalignLib = await HunalignLib.Hunalign.create(hunalignWasm);

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
    hunalignLib,
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
