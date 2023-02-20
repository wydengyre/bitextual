import { readFixtureString } from "../test/util.ts";
import { paragraphs } from "./textreader.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";

Deno.test("separates paragraphs", async () => {
  const text = await readFixtureString("chapitre.txt");
  const separated = paragraphs(text);
  assertStrictEquals(separated.length, 205);
  assertStrictEquals(separated[0], "CHAPITRE I");
  assertStrictEquals(separated[204], "— Non, j’ai faim, vois-tu.");
});
