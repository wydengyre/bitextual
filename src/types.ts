export const Language = {
  english: "en",
  french: "fr",
  italian: "it",
  spanish: "es",
} as const;

type LanguageName = keyof typeof Language;
export type Language = typeof Language[LanguageName];
