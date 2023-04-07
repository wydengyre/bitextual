import { readFixtureString } from "../test/util.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";
import { paragraphs } from "./align.ts";

Deno.test("paragraphs function separates paragraphs", async () => {
  const text = await readFixtureString("bovary.french.edited.txt");
  const separated = paragraphs(text);
  assertStrictEquals(separated.length, 3097);
  assertStrictEquals(separated[0], "Gustave Flaubert MADAME BOVARY");
  assertStrictEquals(
    separated[204],
    "On versa du vin de Champagne à la glace. Emma frissonna de toute sa peau en sentant ce froid dans sa bouche. Elle n'avait jamais vu de grenades ni mangé d'ananas. Le sucre en poudre même lui parut plus blanc et plus fin qu'ailleurs.",
  );
});
