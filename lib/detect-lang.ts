import { franc } from "franc";
import { LanguageName } from "./types.ts";

const $UNSUPPORTED_LANGUAGE = Symbol("UNSUPPORTED_LANGUAGE");
type UnsupportedLanguage = [typeof $UNSUPPORTED_LANGUAGE, string];

const supportedLanguages: Map<string, LanguageName> = new Map([
  ["eng", "english"],
  ["fra", "french"],
  ["ita", "italian"],
  ["spa", "spanish"],
]);

export function detectLang(text: string): LanguageName | UnsupportedLanguage {
  const detected = franc(text);
  return supportedLanguages.get(detected) || unsupportedLanguage(detected);
}

export function unsupportedLanguage(lang: string): UnsupportedLanguage {
  return [$UNSUPPORTED_LANGUAGE, lang];
}
