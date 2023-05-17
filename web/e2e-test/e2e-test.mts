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

    // when we retype the whole text, the test takes too long
    const NUM_LINES = 100;
    const bovaryFrenchFirstLines = bovaryFrench.split("\n").slice(0, NUM_LINES)
      .join("\n");
    const bovaryEnglishFirstLines = bovaryEnglish.split("\n").slice(
      0,
      NUM_LINES,
    ).join("\n");

    await page.focus("#panel-source .cm-editor .cm-content");
    await page.keyboard.sendCharacter(bovaryFrenchFirstLines);
    await page.focus("#panel-target .cm-editor .cm-content");
    await page.keyboard.sendCharacter(bovaryEnglishFirstLines);

    await page.waitForFunction(() =>
      !document.querySelector<HTMLButtonElement>("#align")?.disabled
    );
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
    await page.waitForFunction(
      () =>
        (document.querySelector(
          "#panel-source .cm-editor .cm-content",
        )! as HTMLDivElement)
          .innerText.length > 1000,
    );

    [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click("button#import-epub-target"),
    ]);
    await fileChooser.accept([BOVARY_EPUB_IMG_PATH]);
    await page.waitForFunction(
      () =>
        (document.querySelector(
          "#panel-target .cm-editor .cm-content",
        )! as HTMLDivElement)
          .innerText.length > 1000,
    );

    const sourceText = await page.evaluate(() => {
      const element = document.querySelector(
        "#panel-source .cm-editor .cm-content",
      )!;
      if (!(element instanceof HTMLDivElement)) {
        throw new Error("element is not a div");
      }
      return element.innerText;
    });

    const targetText = await page.evaluate(() => {
      const element = document.querySelector(
        "#panel-target .cm-editor .cm-content",
      )!;
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
  }),
);
