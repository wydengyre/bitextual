import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { go } from "@bitextual/cli/main.js";
import { fixturePath } from "@bitextual/test/util.js";

const bovaryFrenchPath = fixturePath("bovary.french.epub");
const bovaryEnglishPath = fixturePath("bovary.english.epub");
const alignedHtml = await go(["--html", bovaryFrenchPath, bovaryEnglishPath]);

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "..", "dist", "bovary.aligned");
const outHtmlPath = path.join(outDir, "index.html");
mkdirSync(outDir, { recursive: true });
writeFileSync(outHtmlPath, alignedHtml);
