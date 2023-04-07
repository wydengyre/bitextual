// https://stackoverflow.com/a/26900132
const pattern = /[^[A-Za-zÀ-ÖØ-öø-ÿа-я0-9_]+/;

export function tokenizeWords(text: string): string {
  return text.split(pattern).join(" ").trim();
}
