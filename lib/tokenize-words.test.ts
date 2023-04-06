import { tokenizeWords } from "./tokenize-words.ts";
import { assertStrictEquals } from "std/testing/asserts.ts";

Deno.test("tokenizeWords", () => {
  const example = "Here's an example sentence, let's see what we get.";
  const result = tokenizeWords(example);
  assertStrictEquals(
    result,
    "Here s an example sentence let s see what we get",
  );
});
