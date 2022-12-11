import { Language } from "./types.ts";
import init, { split } from "../resources/punkt/punkt.js";

export class Punkt {
  private constructor() {
  }

  sentences(language: Language, paragraphs: string[]) {
    return split(language, paragraphs);
  }

  static async create(): Promise<Punkt> {
    await init();
    return new Punkt();
  }
}
