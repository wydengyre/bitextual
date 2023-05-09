import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { PuppeteerLaunchOptions } from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL: string = process.env.BITEXTUAL_TEST_BASE_URL!;
const TEST_FILES_PATH = resolve(__dirname, "../../test");
const BOVARY_ENGLISH_PATH = resolve(
  TEST_FILES_PATH,
  "bovary.english.edited.txt",
);
const BOVARY_FRENCH_PATH = resolve(TEST_FILES_PATH, "bovary.french.edited.txt");
const BOVARY_EPUB_PATH = resolve(TEST_FILES_PATH, "bovary.english.epub");
const BOVARY_EPUB_IMG_PATH = resolve(
  TEST_FILES_PATH,
  "bovary.english.images.epub",
);
const BOVARY_EPUB_TEXT_PATH = resolve(
  TEST_FILES_PATH,
  "bovary.english.epub.txt",
);

// slurp Bovary english text from file system
const bovaryEnglish = await readFile(BOVARY_ENGLISH_PATH, "utf8");
const bovaryFrench = await readFile(BOVARY_FRENCH_PATH, "utf8");
const bovaryEpubText = await readFile(BOVARY_EPUB_TEXT_PATH, "utf8");

function withBrowser(
  options: PuppeteerLaunchOptions,
  fn: (browser: puppeteer.Browser) => Promise<void>,
) {
  return async function () {
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
  return withBrowser({ headless: "new" }, fn);
}

// use this for debugging
function _withSlowMoBrowser(fn: (browser: puppeteer.Browser) => Promise<void>) {
  return withBrowser({ headless: false, slowMo: 250 }, fn);
}

test(
  "alignment",
  withHeadlessBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.setViewport({ width: 1080, height: 1024 });

    await page.$eval("#source-text", pasteText, bovaryFrench);
    await page.$eval("#target-text", pasteText, bovaryEnglish);
    await page.click("button[type=submit]");

    await page.waitForFunction(() => document.title === "bitextual render");
    const firstSentenceElement = await page.$(".sentence");
    const firstSentenceTextHandle = await firstSentenceElement!.getProperty(
      "innerText",
    );
    const firstSentence = await firstSentenceTextHandle.jsonValue();
    assert.equal(firstSentence, "Gustave Flaubert MADAME BOVARY");
  }),
);

test(
  "epub import",
  withHeadlessBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.setViewport({ width: 1080, height: 1024 });

    let [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click("button#import-epub-source"),
    ]);
    await fileChooser.accept([BOVARY_EPUB_PATH]);
    // wait for the text content of the source-text textarea to change
    await page.waitForFunction(
      () =>
        (document.querySelector("#source-text")! as HTMLTextAreaElement)
          .value !== "",
    );

    [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click("button#import-epub-target"),
    ]);
    await fileChooser.accept([BOVARY_EPUB_IMG_PATH]);
    // wait for the text content of the source-text textarea to change
    await page.waitForFunction(
      () =>
        (document.querySelector("#target-text")! as HTMLTextAreaElement)
          .value !== "",
    );

    const sourceTextElement = await page.$("#source-text");
    const sourceTextHandle = await sourceTextElement!.getProperty("value");
    const sourceText = await sourceTextHandle.jsonValue();

    const targetTextElement = await page.$("#target-text");
    const targetTextHandle = await targetTextElement!.getProperty("value");
    const targetText = await targetTextHandle.jsonValue();

    assert.equal(sourceText, bovaryEpubText);
    assert.equal(targetText, bovaryEpubText);
  }),
);

function pasteText(el: Element, value: string) {
  if (!("value" in el)) {
    throw "element does not have a value property";
  }
  el.value = value;
}
