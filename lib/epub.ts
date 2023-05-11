// this file meant to work in both deno and browser

import { DOMParser } from "@xmldom/xmldom";
// @deno-types="npm:@types/html-to-text@9.0.0"
import { compile as compileHtmlConvert } from "html-to-text";
import JSZip from "jszip";

export async function epubToText(epubBytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(epubBytes);
  const files = zip.files;
  const container = files["META-INF/container.xml"]!;
  const containerTxt = await container.async("text");

  const containerDom = new DOMParser().parseFromString(
    containerTxt,
    "text/html",
  )!;
  const rootPath = containerDom.getElementsByTagName("rootfile")[0]
    .getAttribute("full-path")!;
  const rootDir = rootPath.split("/").slice(0, -1).join("/");

  const opf = files[rootPath]!;
  const opfTxt = await opf.async("text");
  const opfDom = new DOMParser().parseFromString(opfTxt, "text/html")!;

  const spine = Array.from(
    opfDom
      .getElementsByTagName("package")[0]!
      .getElementsByTagName("spine")[0]!
      .getElementsByTagName("itemref")!,
  )
    .map((item) => item.getAttribute("idref")!);

  const manifest = opfDom.getElementsByTagName("manifest")[0];
  const manifestItems = Array.from(manifest.getElementsByTagName("item"))
    .map((item) =>
      [item.getAttribute("id")!, item.getAttribute("href")!] as const
    );
  const manifestMap: Map<string, string> = new Map(manifestItems);

  const orderedFiles = spine.map((id) => [id, manifestMap.get(id)!]);
  const htmlPromises = [...orderedFiles.values()].map(([id, path]) => {
    const fullPath = `${rootDir}/${path}`;
    const file = files[fullPath];
    if (file === undefined) {
      throw new Error(
        `file with id ${id} at ${fullPath} (resolved from relative path ${path}) not found`,
      );
    }
    return file.async("text");
  });
  const htmls = await Promise.all(htmlPromises);

  const htmlToText = compileHtmlConvert({
    selectors: [
      // don't include links in text
      { selector: "a", options: { ignoreHref: true } },
      // don't include images in text
      { selector: "img", format: "skip" },
    ],
    wordwrap: false,
  });
  const epubText = htmls
    .map((html) => htmlToText(html))
    .join("\n");
  return processLineBreaks(epubText);
}

export function processLineBreaks(text: string): string {
  const normalizedText = text.replace(/\r\n/g, "\n");
  const collapsedParagraphs = normalizedText.replace(/(?<!\n)\n(?!\n)/g, " ");
  return collapsedParagraphs.replace(/\n+/g, "\n");
}