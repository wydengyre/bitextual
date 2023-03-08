import { LanguageTaggedText } from "../lib/types.js";
import { paragraphs } from "../lib/textreader.js";

self.onmessage = (
  e: MessageEvent<[LanguageTaggedText, LanguageTaggedText]>,
) => {
  const [source, target] = e.data;
  const [sourcePars, targetPars] = renderAlignment(source, target);
  postMessage([sourcePars, targetPars]);
};

function renderAlignment(
  [sourceLang, sourceText]: LanguageTaggedText,
  [targetLang, targetText]: LanguageTaggedText,
): [string[], string[]] {
  const sourceParagraphs: string[] = paragraphs(sourceText);
  const targetParagraphs: string[] = paragraphs(targetText);
  return [sourceParagraphs, targetParagraphs];
}
