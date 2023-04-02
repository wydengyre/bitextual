import { readFixtureString } from "../test/util.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";
import { paragraphs } from "./align.ts";

Deno.test("paragraphs function separates paragraphs", async () => {
  const text = await readFixtureString("chapitre.txt");
  const separated = paragraphs(text);
  assertStrictEquals(separated.length, 205);
  assertStrictEquals(separated[0], "CHAPITRE I");
  assertStrictEquals(separated[204], "— Non, j’ai faim, vois-tu.");
});
