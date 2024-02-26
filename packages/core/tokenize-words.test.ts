import { strict as assert } from "node:assert";
import { test } from "node:test";
import { tokenizeWords } from "./tokenize-words.js";

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
