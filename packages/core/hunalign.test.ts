import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyLadder, tokenizeWords } from "./hunalign.js";

test("tokenizeWords", () => {
	const example = "Here's an example sentence, let's see what we get.";
	const result = tokenizeWords(example);
	assert.strictEqual(
		result,
		"Here s an example sentence let s see what we get",
	);
});

test("tokenizeWords with diacritics", () => {
	const example =
		"Il y eut un rire éclatant des écoliers qui décontenança le pauvre garçon, si bien qu'il ne savait s'il fallait garder sa casquette à la main, la laisser par terre ou la mettre sur sa tête. Il se rassit et la posa sur ses genoux.";
	const result = tokenizeWords(example);
	assert.strictEqual(
		result,
		"Il y eut un rire éclatant des écoliers qui décontenança le pauvre garçon si bien qu il ne savait s il fallait garder sa casquette à la main la laisser par terre ou la mettre sur sa tête Il se rassit et la posa sur ses genoux",
	);
});

test("applyLadder", () => {
	const ladder: [number, number][] = [
		[0, 0],
		[0, 1],
		[1, 2],
		[2, 3],
		[4, 4],
	];
	const source = ["A", "B", "C", "D", "E"];
	const target = ["A", "B", "C", "D", "E"];
	const result = applyLadder(ladder, source, target);
	assert.deepStrictEqual(result, [
		[[], ["A"]],
		[["A"], ["B"]],
		[["B"], ["C"]],
		[["C", "D"], ["D"]],
		[["E"], ["E"]],
	]);
});
