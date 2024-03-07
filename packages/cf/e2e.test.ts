import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixturePath, readFixtureString } from "@bitextual/test/util.js";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";
import conf from "./conf.json" with { type: "json" };

async function run() {
	using _server = startServer();

	// ideally we'd wait for the server to tell us it's ready, but this works
	await new Promise((resolve) => setTimeout(resolve, 3_000));

	await test("404", withHeadlessBrowser(test404));
	await test("epub import", withHeadlessBrowser(testEpubImport));
	await test("alignment", withHeadlessBrowser(testAlignment));
}

const SERVER_PORT = 8788;
const BOVARY_EPUB_PATH = fixturePath("bovary.english.epub");
const BOVARY_EPUB_IMG_PATH = fixturePath("bovary.english.images.epub");
const bovaryEnglish = await readFixtureString("bovary.english.edited.txt");
const bovaryFrench = await readFixtureString("bovary.french.edited.txt");
const bovaryEpubText = await readFixtureString("bovary.english.epub.txt");
const dir = dirname(fileURLToPath(import.meta.resolve("@bitextual/web/dist")));
const baseUrl = `http://localhost:${SERVER_PORT}`;
await run();

async function testAlignment(browser: Browser) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const expectedPath = join(__dirname, "test", "aligned.html");
	const expected = await readFile(expectedPath, "utf8");

	const page = await browser.newPage();
	await page.goto(baseUrl);
	await page.setViewport({ width: 1080, height: 1024 });

	// when we retype the whole text, the test takes too long
	const NUM_LINES = 100;
	const bovaryFrenchFirstLines = bovaryFrench
		.split("\n")
		.slice(0, NUM_LINES)
		.join("\n");
	const bovaryEnglishFirstLines = bovaryEnglish
		.split("\n")
		.slice(0, NUM_LINES)
		.join("\n");

	await page.click("#continue-btn");

	await page.focus("#panel-source .cm-editor .cm-content");
	await page.keyboard.sendCharacter(bovaryFrenchFirstLines);
	await page.focus("#panel-target .cm-editor .cm-content");
	await page.keyboard.sendCharacter(bovaryEnglishFirstLines);

	await page.waitForFunction(
		() => !document.querySelector<HTMLButtonElement>("#align")?.disabled,
	);
	await page.click("button[type=submit]");

	await page.waitForFunction(
		() => document.title === "bitextual parallel book",
	);
	const content = await page.content();

	const pageCanonical = canonicalizeHtml(content);
	const expectedCanonical = canonicalizeHtml(expected);
	assert.strictEqual(pageCanonical, expectedCanonical);
}

async function testEpubImport(browser: Browser) {
	const page = await browser.newPage();
	await page.goto(baseUrl);
	await page.setViewport({ width: 1080, height: 1024 });

	await page.click("#continue-btn");

	let [fileChooser] = await Promise.all([
		page.waitForFileChooser(),
		page.click("button#import-epub-source"),
	]);
	await fileChooser.accept([BOVARY_EPUB_PATH]);
	await page.waitForFunction(
		() =>
			(
				document.querySelector(
					"#panel-source .cm-editor .cm-content",
				) as HTMLDivElement
			).innerText.length > 1000,
	);

	[fileChooser] = await Promise.all([
		page.waitForFileChooser(),
		page.click("button#import-epub-target"),
	]);
	await fileChooser.accept([BOVARY_EPUB_IMG_PATH]);
	await page.waitForFunction(
		() =>
			(
				document.querySelector(
					"#panel-target .cm-editor .cm-content",
				) as HTMLDivElement
			).innerText.length > 1000,
	);

	const sourceText = await page.evaluate(() => {
		const element = document.querySelector(
			"#panel-source .cm-editor .cm-content",
		);
		if (!(element instanceof HTMLDivElement)) {
			throw new Error("element is not a div");
		}
		return element.innerText;
	});

	const targetText = await page.evaluate(() => {
		const element = document.querySelector(
			"#panel-target .cm-editor .cm-content",
		);
		if (!(element instanceof HTMLDivElement)) {
			throw new Error("element is not a div");
		}
		return element.innerText;
	});

	// because of the way our text editor works, most of the text
	// will be hidden out of view, and getting it in puppeteer is hard
	const LENGTH_TO_TEST = 1000;
	assert.equal(
		sourceText.slice(0, LENGTH_TO_TEST),
		bovaryEpubText.slice(0, LENGTH_TO_TEST),
	);
	assert.equal(
		targetText.slice(0, LENGTH_TO_TEST),
		bovaryEpubText.slice(0, LENGTH_TO_TEST),
	);
}

async function test404(browser: Browser) {
	const page = await browser.newPage();
	await page.goto(`${baseUrl}/nonexistent`);

	const pageHTML = await page.evaluate(() => document.body.innerHTML);
	assert.equal(pageHTML, "404 Not Found\n");
}

function withBrowser(
	options: PuppeteerLaunchOptions,
	fn: (browser: puppeteer.Browser) => Promise<void>,
) {
	return async () => {
		const browser = await puppeteer.launch(options);
		try {
			await fn(browser);
		} finally {
			await browser.close();
		}
	};
}
function withHeadlessBrowser(
	fn: (browser: puppeteer.Browser) => Promise<void>,
) {
	return withBrowser({ headless: true }, fn);
}

// use this for debugging
// function withSlowMoBrowser(fn: (browser: puppeteer.Browser) => Promise<void>) {
// 	return withBrowser({ headless: false, slowMo: 250 }, fn);
// }

function startServer() {
	const proc = spawn(
		"npx",
		[
			"wrangler",
			"pages",
			"dev",
			"--port",
			SERVER_PORT.toString(),
			"--compatibility-date",
			conf.compatibilityDate,
			dir,
		],
		{
			stdio: ["pipe", "inherit", "inherit"],
			detached: true,
		},
	);

	if (proc.pid === undefined) {
		throw new Error("failed to start wrangler: pid undefined");
	}
	const pid = proc.pid;

	const kill = () => process.kill(-pid, "SIGTERM");
	process.on("SIGINT", kill);
	process.on("SIGTERM", kill);
	return { [Symbol.dispose]: kill };
}

function canonicalizeHtml(html: string): string {
	const domParser = new DOMParser();
	const doc = domParser.parseFromString(html, "text/html");
	const serializer = new XMLSerializer();
	return serializer.serializeToString(doc);
}
