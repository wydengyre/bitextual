import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: replace this by passed-in URL
const BASE_URL = "https://bitextual.net";
const TEST_FILES_PATH = resolve(__dirname, "../../test");
const BOVARY_ENGLISH_PATH = resolve(
  TEST_FILES_PATH,
  "bovary.english.edited.txt",
);
const BOVARY_FRENCH_PATH = resolve(TEST_FILES_PATH, "bovary.french.edited.txt");

// slurp Bovary english text from file system
const bovaryEnglish = await readFile(BOVARY_ENGLISH_PATH, "utf8");
const bovaryFrench = await readFile(BOVARY_FRENCH_PATH, "utf8");

const browser = await puppeteer.launch({ headless: "new" });

// uncomment this to see the browser
// const browser = await puppeteer.launch({
//   headless: false,
//   slowMo: 250, // slow down by 250ms
// });

const page = await browser.newPage();
await page.goto(BASE_URL);
await page.setViewport({ width: 1080, height: 1024 });

function pasteText(el: Element, value: string) {
  if (!("value" in el)) {
    throw "element does not have a value property";
  }
  el.value = value;
}
await page.$eval("#source-text", pasteText, bovaryFrench);
await page.$eval("#target-text", pasteText, bovaryEnglish);
await page.click("button[type=submit]");

await page.waitForFunction(() => document.title === "bitextual render");
const firstSentenceElement = (await page.$(".sentence"))!;
const firstSentenceTextHandle = await firstSentenceElement.getProperty(
  "innerText",
);
const firstSentence = await firstSentenceTextHandle.jsonValue();
assert.equal(firstSentence, "Gustave Flaubert MADAME BOVARY");

await browser.close();
