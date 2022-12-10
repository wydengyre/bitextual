import { Language } from "./types.ts";
import init, { split } from "../resources/punkt/punkt.js";

export async function sentences(
  language: Language,
  paragraphs: string[],
): Promise<string[][]> {
  await init();
  return split(language, paragraphs);
}
