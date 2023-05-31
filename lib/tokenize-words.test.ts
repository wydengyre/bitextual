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

Deno.test("tokenizeWords with diacritics", () => {
  const example =
    "Il y eut un rire éclatant des écoliers qui décontenança le pauvre garçon, si bien qu'il ne savait s'il fallait garder sa casquette à la main, la laisser par terre ou la mettre sur sa tête. Il se rassit et la posa sur ses genoux.";
  const result = tokenizeWords(example);
  assertStrictEquals(
    result,
    "Il y eut un rire éclatant des écoliers qui décontenança le pauvre garçon si bien qu il ne savait s il fallait garder sa casquette à la main la laisser par terre ou la mettre sur sa tête Il se rassit et la posa sur ses genoux",
  );
});
