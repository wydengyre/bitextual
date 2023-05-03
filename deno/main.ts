import * as HunalignLib from "../resources/hunalign/web/hunalign.js";
import { isLanguage, Language, language, languageCodes } from "../lib/types.ts";
import { fromFileUrl } from "std/path/mod.ts";
import { align, AlignmentConfig } from "../lib/align.ts";
import { detectLang, isUnsupportedLanguage } from "../lib/detect-lang.ts";

const USAGE = "([sourcelang] [targetlang]) [sourcetext] [targettext]";
const EXAMPLE =
  "deno run --allow-read deno/main.ts test/bovary.french.edited.txt test/bovary.english.edited.txt > test/bovary.aligned.html";

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

export function go(args: string[]): Promise<string> {
  if (args.length === 2) {
    return goDetectingLanguages(args[0], args[1]);
  } else if (args.length === 4) {
    const [cmdSourceLang, cmdTargetLang, sourceTextPath, targetTextPath] = args;
    if (!isLanguage(cmdSourceLang)) {
      console.error(`Invalid source language: ${cmdSourceLang}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }

    if (!isLanguage(cmdTargetLang)) {
      console.error(`Invalid target language: ${cmdTargetLang}`);
      console.error(USAGE);
      console.error(EXAMPLE);
      Deno.exit(1);
    }
    return goProvidingLanguages(
      cmdSourceLang,
      cmdTargetLang,
      sourceTextPath,
      targetTextPath,
    );
  } else {
    throw "Invalid number of arguments";
  }
}

export async function goDetectingLanguages(
  sourcePath: string,
  targetPath: string,
): Promise<string> {
  const sourceText = await Deno.readTextFile(sourcePath);
  const detectedSourceLang = detectLang(sourceText);
  if (isUnsupportedLanguage(detectedSourceLang)) {
    console.error(`Unsupported source language: ${detectedSourceLang[1]}`);
    console.error(USAGE);
    console.error(EXAMPLE);
    Deno.exit(1);
  }
  const sourceLang = language[detectedSourceLang];

  const targetText = await Deno.readTextFile(targetPath);
  const detectedTargetLang = detectLang(targetText);
  if (isUnsupportedLanguage(detectedTargetLang)) {
    console.error(`Unsupported target language: ${detectedTargetLang[1]}`);
    console.error(USAGE);
    console.error(EXAMPLE);
    Deno.exit(1);
  }
  const targetLang = language[detectedTargetLang];

  return goWithLanguagesAndText(sourceLang, targetLang, sourceText, targetText);
}

export async function goProvidingLanguages(
  sourceLang: Language,
  targetLang: Language,
  sourceTextPath: string,
  targetTextPath: string,
): Promise<string> {
  const sourceText = await Deno.readTextFile(sourceTextPath);
  const targetText = await Deno.readTextFile(targetTextPath);

  return goWithLanguagesAndText(sourceLang, targetLang, sourceText, targetText);
}

async function goWithLanguagesAndText(
  sourceLang: Language,
  targetLang: Language,
  sourceText: string,
  targetText: string,
) {
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
