import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { fixturePath, readFixtureString } from "@bitextual/test/util.js";
import { minify } from "html-minifier";
import puppeteer, { type Browser, type Page } from "puppeteer";
import waitOn from "wait-on";
import { compatibilityDate } from "./conf.json" with { type: "json" };

async function run() {
	using _server = startServer();
	const puppeteerP = startPuppeteer();

	// ideally we'd wait for the server to tell us it's ready, but this works
	await new Promise((resolve) => setTimeout(resolve, 3_000));
	using puppeteer = await puppeteerP;
	const { browser } = puppeteer;

	await Promise.all([
		runIsolatedTest("404", browser, test404),
		runIsolatedTest("alignment", browser, testAlignment),
	]);
}

const SERVER_PORT = 8788;
const BOVARY_FRENCH_EPUB_PATH = fixturePath("bovary.french.epub");
const BOVARY_ENGLISH_EPUB_PATH = fixturePath("bovary.english.epub");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_PATH = resolve(__dirname, "dist");
const BASE_URL = new URL(`http://localhost:${SERVER_PORT}`).toString();
const SERVER_LOG_LEVEL = "none";
await run();

async function testAlignment(page: Page) {
	const expectedEpubPath = join(
		__dirname,
		"dist",
		"bovary.aligned",
		"bovary.epub",
	);
	const [expected, expectedEpubStat] = await Promise.all([
		readFixtureString("bovary.aligned.html"),
		stat(expectedEpubPath),
	]);

	await page.goto(BASE_URL);

	const [sourceFileChooser] = await Promise.all([
		page.waitForFileChooser(),
		page.click("#sourceText"),
	]);
	await sourceFileChooser.accept([BOVARY_FRENCH_EPUB_PATH]);

	const [targetFileChooser] = await Promise.all([
		page.waitForFileChooser(),
		page.click("#targetText"),
	]);
	await targetFileChooser.accept([BOVARY_ENGLISH_EPUB_PATH]);

	await page.waitForFunction(
		() => !document.querySelector<HTMLButtonElement>("#submit")?.disabled,
	);

	await using tmp = await mkTempDir();
	const client = await page.createCDPSession();
	await client.send("Page.setDownloadBehavior", {
		behavior: "allow",
		downloadPath: tmp.path,
	});
	await page.click("#epub");

	const downloadPath = join(tmp.path, "bovary.french.epub.aligned.epub");
	await waitOn({
		resources: [downloadPath],
		interval: 100,
		timeout: 5_000,
	});
	const downloadedEpubStat = await stat(downloadPath);
	// compare size because the actual zip binary will differ: zips have date metadata
	// in the future we could recursively compare the content of the files in the zip
	assert.strictEqual(downloadedEpubStat.size, expectedEpubStat.size);

	await page.click("#submit");

	await page.waitForFunction(
		() => document.title === "bitextual parallel book",
	);
	const content = await page.content();

	const pageCanonical = canonicalizeHtml(content);
	const expectedCanonical = canonicalizeHtml(expected);
	assert.strictEqual(pageCanonical, expectedCanonical);
}

async function test404(page: Page) {
	await page.goto(`${BASE_URL}/nonexistent`);

	const pageHTML = await page.evaluate(() => document.body.innerHTML);
	assert.equal(pageHTML, "404 Not Found\n");
}

async function startPuppeteer() {
	const browser = await puppeteer.launch({ headless: true });

	// for debugging, switch to this
	// const browser = puppeteer.launch({ headless: false, slowMo: 250 });

	return { browser, [Symbol.dispose]: () => browser.close() };
}

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
			compatibilityDate,
			"--log-level",
			SERVER_LOG_LEVEL,
			DIST_PATH,
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

async function runIsolatedTest(
	name: string,
	browser: Browser,
	testFn: (page: Page) => Promise<void>,
) {
	const context = await browser.createBrowserContext();
	const page = await context.newPage();
	try {
		await test(name, () => testFn(page));
	} finally {
		await page.close();
		await context.close();
	}
}

function canonicalizeHtml(html: string): string {
	const versionsless = html.replace(
		/<meta name="version" content="[^"]+"\/?>/g,
		"",
	);
	return minify(versionsless, { collapseWhitespace: true });
}

async function mkTempDir() {
	const temp = await mkdtemp("bitextual-e2e");
	return {
		path: temp,
		[Symbol.asyncDispose]: () => rm(temp, { recursive: true }),
	};
}
