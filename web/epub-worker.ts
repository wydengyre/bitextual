// Copyright (C) 2023 Wyden and Gyre, LLC

import { Buffer } from "node:buffer";
import { compile as compileHtmlConvert } from "html-to-text";
import { parseEpub } from "epub-parser";

// ensure async errors get handled just like sync errors
self.onunhandledrejection = (e: PromiseRejectionEvent) => {
  e.preventDefault();
  throw e.reason;
};

self.onmessage = async (e: MessageEvent<Uint8Array>) => {
  const epubData = e.data;
  const text = await epubToText(epubData);
  // can this be out of order somehow?
  postMessage(text);
};

// code repeated here because of the complication of bundling node vs deno imports
async function epubToText(epubBytes: Uint8Array): Promise<string> {
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

function processLineBreaks(text: string): string {
  const normalizedText = text.replace(/\r\n/g, "\n");
  const collapsedParagraphs = normalizedText.replace(/(?<!\n)\n(?!\n)/g, " ");
  return collapsedParagraphs.replace(/\n+/g, "\n");
}
