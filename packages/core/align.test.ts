import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFixtureString } from "@bitextual/test/util.js";
import { paragraphs } from "./align.js";

test("paragraphs function separates paragraphs", async () => {
	const text = await readFixtureString("bovary.french.edited.txt");
	const separated = paragraphs(text);
	assert.strictEqual(separated.length, 3097);
	assert.strictEqual(separated[0], "Gustave Flaubert MADAME BOVARY");
	assert.strictEqual(
		separated[204],
		"On versa du vin de Champagne à la glace. Emma frissonna de toute sa peau en sentant ce froid dans sa bouche. Elle n'avait jamais vu de grenades ni mangé d'ananas. Le sucre en poudre même lui parut plus blanc et plus fin qu'ailleurs.",
	);
});
