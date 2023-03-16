import { Language, LanguageTaggedText } from "../lib/types.js";
import { Punkt } from "../lib/punkt.js";
import { paragraphs } from "../lib/textreader.js";

self.onmessage = async (
  e: MessageEvent<[LanguageTaggedText, LanguageTaggedText]>,
) => {
  const [source, target] = e.data;
  const [sourcePars, targetPars] = await renderAlignment(source, target);
  postMessage([sourcePars, targetPars]);
};

async function renderAlignment(
  [sourceLang, sourceText]: LanguageTaggedText,
  [targetLang, targetText]: LanguageTaggedText,
): Promise<[string[], string[]]> {
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);

  const [sourceTrainingData, targetTrainingData] = await Promise.all([
    getTrainingData(sourceLang),
    getTrainingData(targetLang),
  ]);

  const punktWasm = await fetchBinary(`punkt/punkt_bg.wasm`);
  const punkt = await Punkt.create(punktWasm);
  const sourcePunkt = punkt.sentences(sourceTrainingData, sourceParagraphs);
  const targetPunkt = punkt.sentences(targetTrainingData, targetParagraphs);

  const sourceSplitParagraphs: string[][] = [];
  for await (const splitParagraph of sourcePunkt) {
    sourceSplitParagraphs.push(splitParagraph);
  }
  const targetSplitParagraphs: string[][] = [];
  for await (const splitParagraph of targetPunkt) {
    targetSplitParagraphs.push(splitParagraph);
  }

  if (sourceSplitParagraphs.length !== sourceParagraphs.length) {
    throw `assumed splitParagraphs ${sourceSplitParagraphs.length} and separated ${sourceParagraphs.length} would be equal`;
  }
  if (targetSplitParagraphs.length !== targetParagraphs.length) {
    throw `assumed splitParagraphs ${targetSplitParagraphs.length} and separated ${targetParagraphs.length} would be equal`;
  }

  return [sourceSplitParagraphs, targetSplitParagraphs];
}

function getTrainingData(l: Language): Promise<Uint8Array> {
  const languageData: Map<Language, string> = new Map([
    ["en", "english"],
    ["fr", "french"],
    ["it", "italian"],
    ["es", "spanish"],
  ]);
  const languageName = languageData.get(l)!;
  const languageFileName = `${languageName}.json`;
  return fetchBinary(`punkt/data/${languageFileName}`);
}

async function fetchBinary(url: string): Promise<Uint8Array> {
  const f = await fetch(url);
  const ab = await f.arrayBuffer();
  return new Uint8Array(ab);
}
