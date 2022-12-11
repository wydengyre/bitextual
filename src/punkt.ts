import init, { split } from "../resources/punkt/punkt.js";

export class Punkt {
  private constructor() {
  }

  sentences(trainingData: Uint8Array, paragraphs: string[]) {
    return split(trainingData, paragraphs);
  }

  static async create(): Promise<Punkt> {
    await init();
    return new Punkt();
  }
}
