import { sentences } from "./punkt.ts";
import { readFixtureString } from "../test/util.ts";
import { assertEquals } from "std/testing/asserts.ts";

Deno.test("tokenizes english sentences", async () => {
  const expectedSentencesStr = await readFixtureString("chapter.sentences.txt");
  const expectedSentences = expectedSentencesStr.split("\n");

  const chapter = await readFixtureString("chapter.txt");
  const sents = await sentences("en", chapter);
  assertEquals(sents, expectedSentences);
});

Deno.test("tokenizes french sentences", async () => {
  const expectedSentencesStr = await readFixtureString(
    "chapitre.sentences.txt",
  );
  const expectedSentences = expectedSentencesStr.split("\n");

  const chapter = await readFixtureString("chapitre.txt");
  const sents = await sentences("fr", chapter);
  assertEquals(sents, expectedSentences);
});
