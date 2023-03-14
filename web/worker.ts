import { Language, LanguageTaggedText } from "../lib/types.js";
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
    getTrainingData(targetLang)
  ]);

  // TODO: bring punkt from deno to lib
  // const sourceTokenized = punkt.sentences(sourceTrainingData, sourceParagraphs);
  // const targetTokenized = punkt.sentences(targetTrainingData, targetParagraphs);
  // return [sourceTokenized, targetTokenized];

  return [sourceParagraphs, targetParagraphs];
}

async function getTrainingData(l: Language): Promise<Uint8Array> {
  const languageData: Map<Language, string> = new Map([
    ["en", "english"],
    ["fr", "french"],
    ["it", "italian"],
    ["es", "spanish"],
  ]);
  const languageName = languageData.get(l)!;
  const languageFileName = `${languageName}.json`;
  const f = await fetch(`punkt/${languageFileName}`);
  const ab = await f.arrayBuffer();
  return new Uint8Array(ab);
}
