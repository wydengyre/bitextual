import { fromFileUrl } from "std/path/mod.ts";
import { go } from "./main.ts";
import { readFixtureString } from "../test/util.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";

Deno.test("run main", async () => {
  const sourceLang = "fr";
  const bovaryFrench = fromFileUrl(
    import.meta.resolve("../test/bovary.french.edited.txt"),
  );
  const targetLang = "en";
  const bovaryEnglish = fromFileUrl(
    import.meta.resolve("../test/bovary.english.edited.txt"),
  );
  const result = await go([
    sourceLang,
    targetLang,
    bovaryFrench,
    bovaryEnglish,
  ]);
  const expected = await readFixtureString("bovary.aligned.html");
  assertStrictEquals(result, expected.trim());
});
