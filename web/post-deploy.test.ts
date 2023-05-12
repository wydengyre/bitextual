import { assertStrictEquals } from "std/testing/asserts.ts";

const SITE_URL = "https://bitextual.net";
Deno.test("site is up", async () => {
  const response = await fetch(SITE_URL);
  const text = await response.text();
  const expected = "Bitextual: the parallel book generator";
  const actual = text.match(/<title>(.*)<\/title>/)?.[1];
  assertStrictEquals(actual, expected);
});

Deno.test("http redirects to https", () => {
  // this gets a trailing slash for whatever reason
  return testRedirect("http://bitextual.net", SITE_URL + "/");
});

Deno.test("www redirects to apex", () => {
  return testRedirect("https://www.bitextual.net", SITE_URL);
});

Deno.test("http www redirects to apex", () => {
  return testRedirect("http://www.bitextual.net", SITE_URL);
});

async function testRedirect(source: string, dest: string) {
  const response = await fetch(source, { redirect: "manual" });
  const cancelPromise = response.body!.cancel();
  const code = response.status;
  const redirectLocation = response.headers.get("location")!;
  try {
    assertStrictEquals(code, 301);
    assertStrictEquals(redirectLocation, dest);
  } finally {
    await cancelPromise;
  }
}
