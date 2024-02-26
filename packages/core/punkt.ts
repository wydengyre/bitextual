import init, { split } from "@bitextual/punkt/punkt.js";

// TODO: the class-based approach seems odd. Perhaps calling create should initialize a global variable?
export class Punkt {
	private constructor() {}

	sentences(trainingData: Uint8Array, paragraphs: string[]): string[][] {
		return split(trainingData, paragraphs);
	}

	static async create(punktWasm: Uint8Array): Promise<Punkt> {
		await init(punktWasm);
		return new Punkt();
	}
}
