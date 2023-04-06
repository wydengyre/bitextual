const pattern = /[^A-Za-zА-Яа-я0-9_]+/;
export function tokenizeWords(text: string): string {
  return text.split(pattern).join(" ").trim();
}
