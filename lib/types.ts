export const Language = {
  english: "en",
  french: "fr",
  italian: "it",
  spanish: "es",
} as const;

export type LanguageName = keyof typeof Language;
export type Language = typeof Language[LanguageName];

export const languages: Set<Language> = new Set(Object.values(Language));

export function isLanguage(l: string): l is Language {
  return languages.has(l as Language);
}
