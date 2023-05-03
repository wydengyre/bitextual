import { assertStrictEquals } from "std/testing/asserts.ts";

const SITE_URL = "https://bitextual.net";
Deno.test("site is up", async () => {
  const response = await fetch(SITE_URL);
  const text = await response.text();
  const expected = "Bitextual: align texts in different languages";
  const actual = text.match(/<title>(.*)<\/title>/)?.[1];
  assertStrictEquals(actual, expected);
});
