import init, { split } from "../resources/punkt/punkt.js";

export class Punkt {
  private constructor() {
  }

  sentences(trainingData: Uint8Array, paragraphs: string[]): string[][] {
    return split(trainingData, paragraphs);
  }

  static async create(punktWasm: Uint8Array): Promise<Punkt> {
    await init(punktWasm);
    return new Punkt();
  }
}
