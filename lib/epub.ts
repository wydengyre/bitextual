import { Buffer } from "node:buffer";
// @deno-types="npm:@types/html-to-text@9.0.0"
import { compile as compileHtmlConvert } from "html-to-text";
import { parseEpub } from "epub-parser";

export async function epubToText(epubBytes: Uint8Array): Promise<string> {
  const epubBuffer = new Buffer(epubBytes);
  const epub = await parseEpub(epubBuffer, { type: "buffer" });
  const htmlToText = compileHtmlConvert({
    selectors: [
      // don't include links in text
      { selector: "a", options: { ignoreHref: true } },
      // don't include images in text
      { selector: "img", format: "skip" },
    ],
    wordwrap: false,
  });
  const epubText = epub.sections!
    .map((section) => htmlToText(section.htmlString))
    .join("\n");
  return processLineBreaks(epubText);
}

export function processLineBreaks(text: string): string {
  const normalizedText = text.replace(/\r\n/g, "\n");
  const collapsedParagraphs = normalizedText.replace(/(?<!\n)\n(?!\n)/g, " ");
  return collapsedParagraphs.replace(/\n+/g, "\n");
}
