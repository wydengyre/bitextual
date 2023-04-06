import { readFixtureString } from "../test/util.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";
import { paragraphs } from "./align.ts";

Deno.test("paragraphs function separates paragraphs", async () => {
  const text = await readFixtureString("bovary.french.edited.txt");
  const separated = paragraphs(text);
  assertStrictEquals(separated.length, 3099);
  assertStrictEquals(separated[0], "Gustave Flaubert MADAME BOVARY");
  assertStrictEquals(separated[204], "Madame Bovary remarqua que plusieurs dames n'avaient pas mis leurs gants dans leur verre.");
});
