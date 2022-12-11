import { Punkt } from "./punkt.ts";
import { readFixtureString } from "../test/util.ts";

Deno.test("tokenizes english sentences", async () => {
  // const expectedSentencesStr = await readFixtureString("chapter.sentences.txt");
  // const expectedSentences = expectedSentencesStr.split("\n");

  const chapter = (await readFixtureString("chapter.txt"))
    .split("\n");
  const punkt = await Punkt.create();
  const sents = punkt.sentences("en", chapter);
  console.log(sents);
  // assertEquals(sents, expectedSentences);
});

Deno.test("tokenizes french sentences", async () => {
  // const expectedSentencesStr = await readFixtureString(
  //   "chapitre.sentences.txt",
  // );
  // const expectedSentences = expectedSentencesStr.split("\n");
  //
  const chapter = (await readFixtureString("chapitre.txt"))
    .split("\n");
  const punkt = await Punkt.create();
  const sents = punkt.sentences("fr", chapter);
  console.log(sents);
  // assertEquals(sents, expectedSentences);
});
