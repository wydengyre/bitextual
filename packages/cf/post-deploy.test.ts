import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://bitextual.net";
test("site is up", async () => {
	const response = await fetch(SITE_URL);
	const text = await response.text();
	const expected = "Bitextual: the bilingual book generator";
	const actual = text.match(/<title>(.*)<\/title>/)?.[1];
	assert.strictEqual(actual, expected);
});

const ROBOTS_URL = `${SITE_URL}/robots.txt`;
const ROBOTS_PATH = fileURLToPath(
	import.meta.resolve("@bitextual/web/dist/robots.txt"),
);
test("robots.txt is being served", async () => {
	const robots = await readFile(ROBOTS_PATH, "utf-8");
	const response = await fetch(ROBOTS_URL);
	const text = await response.text();
	assert.strictEqual(text, robots);
});

const CONTACT_URL = `${SITE_URL}/contact`;
test("contact page is up", async () => {
	const response = await fetch(CONTACT_URL);
	const text = await response.text();
	const expected = "Bitextual: contact us";
	const actual = text.match(/<title>(.*)<\/title>/)?.[1];
	assert.strictEqual(actual, expected);
});

const TUTORIAL = `${SITE_URL}/tutorial`;
test("contact page is up", async () => {
	const response = await fetch(TUTORIAL);
	const text = await response.text();
	const expected = "Bitextual: tutorial";
	const actual = text.match(/<title>(.*)<\/title>/)?.[1];
	assert.strictEqual(actual, expected);
});

const NONEXISTENT_URL = `${SITE_URL}/nonexistent`;
test("request for nonexistent page leads to 404", async () => {
	const response = await fetch(NONEXISTENT_URL);
	assert.strict(!response.ok);
	assert.strictEqual(response.status, 404);
	const text = await response.text();
	assert.strictEqual(text, "404 Not Found\n");
});

test("http redirects to https", () => {
	// this gets a trailing slash for whatever reason
	return testRedirect("http://bitextual.net", `${SITE_URL}/`);
});

test("www redirects to apex", () => {
	return testRedirect("https://www.bitextual.net", SITE_URL);
});

test("http www redirects to apex", () => {
	return testRedirect("http://www.bitextual.net", SITE_URL);
});

async function testRedirect(source: string, dest: string) {
	const response = await fetch(source, { redirect: "manual" });
	if (!response.body) {
		throw new Error("Response has no body");
	}
	const cancelPromise = response.body.cancel();
	const code = response.status;
	const redirectLocation = response.headers.get("location");
	try {
		assert.strictEqual(code, 301);
		assert.strictEqual(redirectLocation, dest);
	} finally {
		await cancelPromise;
	}
}
