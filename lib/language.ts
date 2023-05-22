export const language = {
  english: "en",
  french: "fr",
  german: "de",
  italian: "it",
  spanish: "es",
} as const;

export const languageCodes: Map<Language, LanguageName> = new Map(
  Object.entries(language).map(([k, v]) => [v, k as LanguageName]),
);
export type LanguageName = keyof typeof language;
export type Language = typeof language[LanguageName];

export const languages: Set<Language> = new Set(Object.values(language));

export function isLanguage(l: string): l is Language {
  return languages.has(l as Language);
}
