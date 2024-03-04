import type * as HunalignLib from "@bitextual/hunalign";

export { Hunalign, tokenizeWords };

// I have yet to find a better way to do this.
type LibHunalign = Awaited<ReturnType<typeof HunalignLib.Hunalign.create>>;

class Hunalign {
	#hunalign: LibHunalign;

	private constructor(hunalign: LibHunalign) {
		this.#hunalign = hunalign;
	}

	private pairs(
		dictionary: Uint8Array,
		source: string,
		target: string,
	): [number, number, number][] {
		const te = new TextEncoder();
		const sourceBinary = te.encode(source);
		const targetBinary = te.encode(target);
		return this.#hunalign.run(dictionary, sourceBinary, targetBinary);
	}

	align(
		dictionary: Uint8Array,
		sourceParas: string[],
		targetParas: string[],
	): [string[], string[]][] {
		// Use a word tokenizer to split paragraphs into words joined by spaces.
		// This gives a higher Hunalign score, as it will match more words.
		const sourceTokenized = sourceParas.map((p) => tokenizeWords(p));
		const targetTokenized = targetParas.map((p) => tokenizeWords(p));

		const sourceText = sourceTokenized.join("\n");
		const targetText = targetTokenized.join("\n");

		const ladder = this.pairs(dictionary, sourceText, targetText);

		const matches: [string[], string[]][] = [];
		let oldLPrime = 0;
		let oldRPrime = 0;
		for (let i = 0, l = 0, r = 0; i < ladder.length; i++) {
			const [lPrime, rPrime] = ladder[i] as [number, number, number];

			if (lPrime === oldLPrime && rPrime !== oldRPrime) {
				const [_, previousRight] = matches[matches.length - 1] as [
					string[],
					string[],
				];
				for (; r <= rPrime; r++) {
					previousRight.push(targetParas[r] as string);
				}
				continue;
			}

			if (rPrime === oldRPrime && lPrime !== oldLPrime) {
				const [previousLeft] = matches[matches.length - 1] as [
					string[],
					string[],
				];
				for (; l <= lPrime; l++) {
					previousLeft.push(sourceParas[l] as string);
				}
				continue;
			}

			const leftLines: string[] = [];
			for (; l <= lPrime; l++) {
				leftLines.push(sourceParas[l] as string);
			}

			const rightLines: string[] = [];
			for (; r <= rPrime; r++) {
				rightLines.push(targetParas[r] as string);
			}

			matches.push([leftLines, rightLines]);
			oldLPrime = lPrime;
			oldRPrime = rPrime;
		}

		return matches;
	}

	// TODO: is a class the right way to do this? Looks like once we invoke Hunalign, it's done,
	// so maybe a global singleton is better?
	static create(hunalignLib: HunalignLib.Hunalign): Hunalign {
		return new Hunalign(hunalignLib);
	}
}

// https://stackoverflow.com/a/26900132
const wordPattern = /[^[A-Za-zÀ-ÖØ-öø-ÿа-я0-9_]+/;
function tokenizeWords(text: string): string {
	return text.split(wordPattern).join(" ").trim();
}
