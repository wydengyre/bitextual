import { create as createHunalign } from "@bitextual/hunalign";
import type { Hunalign as LibHunalign } from "@bitextual/hunalign";

export { Hunalign, applyLadder, tokenizeWords };

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

		const ladder = this.pairs(dictionary, sourceText, targetText).map(
			([l, r, _]): [number, number] => [l, r],
		);

		return applyLadder(ladder, sourceParas, targetParas);
	}

	static async create(): Promise<Hunalign> {
		const hunalign = await createHunalign();
		return new Hunalign(hunalign);
	}
}

function applyLadder(
	ladder: [number, number][],
	source: string[],
	target: string[],
): [string[], string[]][] {
	const ladderPairs = Array.from(pairwise(ladder));
	const out: [string[], string[]][] = ladderPairs.map(([hole1, hole2]) => [
		source.slice(hole1[0], hole2[0]),
		target.slice(hole1[1], hole2[1]),
	]);
	const [finalSource, finalTarget] = ladder[ladder.length - 1] as [
		number,
		number,
	];
	out.push([[source[finalSource] as string], [target[finalTarget] as string]]);
	return out;
}

// Generates pairs of elements from the iterable, similar to the pairwise function in Python.
function* pairwise<T>(iterable: T[]): Generator<[T, T]> {
	let previous = iterable[0] as T;
	for (const t of iterable.slice(1)) {
		yield [previous, t];
		previous = t;
	}
}

// https://stackoverflow.com/a/26900132
const wordPattern = /[^[A-Za-zÀ-ÖØ-öø-ÿа-я0-9_]+/;
function tokenizeWords(text: string): string {
	return text.split(wordPattern).join(" ").trim();
}
