import { DOMParser } from "@xmldom/xmldom";
import { compile as compileHtmlConvert } from "html-to-text";
import JSZip, { type JSZipObject } from "jszip";

export { epubParas, epubToText, generateAlignedEpub };

async function* epubParas(
	epubBytes: ArrayBuffer,
): AsyncGenerator<string, void, undefined> {
	const htmls = epubHtmls(epubBytes);
	for await (const html of htmls) {
		yield* htmlToParas(html);
	}
}

async function epubToText(epubBytes: ArrayBuffer): Promise<string> {
	const htmlToText = compileHtmlConvert({
		selectors: [
			// don't include links in text
			{ selector: "a", options: { ignoreHref: true } },
			// don't include images in text
			{ selector: "img", format: "skip" },
		],
		wordwrap: false,
	});
	let epubText = "";
	const htmls = epubHtmls(epubBytes);
	for await (const html of htmls) {
		epubText += `${htmlToText(html)}\n`;
	}
	const normalizedText = epubText.replace(/\r\n/g, "\n");
	return normalizedText.replace(/\n+/g, "\n").trim();
}

async function* epubHtmls(epubBytes: ArrayBuffer): AsyncGenerator<string> {
	const domParser = new DOMParser();
	const zip = await JSZip.loadAsync(epubBytes);
	const files = zip.files;

	const rootPath = await getRootPath(domParser, files);
	const rootDir = rootPath.split("/").slice(0, -1).join("/");
	const opfDom = await epubZipDom(domParser, files, rootPath);

	const manifest = opfDom.getElementsByTagName("manifest")[0];
	if (manifest === undefined) {
		throw new Error(`manifest not found in DOM: ${opfDom.toString()}`);
	}
	const manifestMap: Map<string, string> = mkManifestMap(manifest);

	const spineHtmls = getSpineHtmls(files, opfDom, manifestMap, rootDir);
	for await (const [_, html] of spineHtmls) {
		yield html;
	}
}

async function generateAlignedEpub(
	alignedParas: [string[], string[]][],
	sourceEpub: ArrayBuffer,
): Promise<ArrayBuffer> {
	const TRANSLATION_FILENAME = "bitextual-translation.xhtml";

	const targetParas = alignedParas.map(([_, paras]) => paras);
	const targetParasHtml = parasHtml(targetParas);

	const domParser = new DOMParser();
	const zip = await JSZip.loadAsync(sourceEpub);
	const files = zip.files;

	const rootPath = await getRootPath(domParser, files);
	const rootDir = rootPath.split("/").slice(0, -1).join("/");

	const opfDom = await epubZipDom(domParser, files, rootPath);

	const manifest = opfDom.getElementsByTagName("manifest")[0];
	if (manifest === undefined) {
		throw new Error(`manifest not found in DOM: ${opfDom.toString()}`);
	}

	// could make this faster by exiting on first match
	const navDocFileName = Array.from(manifest.getElementsByTagName("item"))
		.filter((item) => item.getAttribute("properties") === "nav")[0]
		?.getAttribute("href");

	const newItem = opfDom.createElement("item");
	const itemId = "bitextual-translation";
	newItem.setAttribute("href", TRANSLATION_FILENAME);
	newItem.setAttribute("id", itemId);
	newItem.setAttribute("media-type", "application/xhtml+xml");
	manifest.appendChild(newItem);

	const spine = opfDom.getElementsByTagName("spine")[0];
	if (spine === undefined) {
		throw new Error(`spine not found in DOM: ${opfDom.toString()}`);
	}
	const newItemRef = opfDom.createElement("itemref");
	newItemRef.setAttribute("idref", itemId);
	spine.appendChild(newItemRef);

	const newOpfTxt = opfDom.toString();
	zip.file(rootPath, newOpfTxt);

	const translationPath = pathJoin(rootDir, TRANSLATION_FILENAME);
	zip.file(translationPath, targetParasHtml);

	if (navDocFileName) {
		const navDocPath = pathJoin(rootDir, navDocFileName);
		const navDoc = files[navDocPath];
		if (navDoc === undefined) {
			console.error(`navDoc file not found at ${navDocPath}`);
		} else {
			const navDocText = await navDoc.async("text");
			const navDom = new DOMParser().parseFromString(
				navDocText,
				"application/xml",
			);
			const ol = Array.from(navDom.getElementsByTagName("ol")).at(-1);
			if (ol === undefined) {
				throw new Error(`ol not found in navDoc: ${navDom.toString()}`);
			}
			const translationsTitle = navDom.createTextNode("Bitextual translations");
			const translationsLink = navDom.createElement("a");
			translationsLink.setAttribute("href", TRANSLATION_FILENAME);
			translationsLink.appendChild(translationsTitle);
			const translationsLi = navDom.createElement("li");
			translationsLi.appendChild(translationsLink);
			ol.appendChild(translationsLi);
			const newNav = navDom.toString();
			zip.file(navDocPath, newNav);
		}
	}

	// paraIndices tells us "in our epub, we will want a link from the end of source para X to the start of target para Y"
	const paraIndices: [number, number][] = [];
	let previousSourceIndex = 0;
	let previousTargetIndex = 0;
	for (const [sourcePs, targetPs] of alignedParas) {
		if (sourcePs.length > 0) {
			paraIndices.push([
				previousSourceIndex + sourcePs.length - 1,
				previousTargetIndex,
			]);
		}
		previousSourceIndex += sourcePs.length;
		previousTargetIndex += targetPs.length;
	}

	const manifestMap: Map<string, string> = mkManifestMap(manifest);
	const spineHtmls = getSpineHtmls(files, opfDom, manifestMap, rootDir);

	let alignmentIndex = 0;
	let paraIndex = 0;
	for await (const [filePath, html] of spineHtmls) {
		const doc = domParser.parseFromString(html, "text/html");

		const paras = doc.getElementsByTagName("p");
		const parasArr = Array.from(paras);
		for (const para of parasArr) {
			const pair = paraIndices[alignmentIndex];
			if (pair === undefined) {
				break;
			}
			const [sourceIndex, targetIndex] = pair;
			if (paraIndex === sourceIndex) {
				const linkText = doc.createTextNode("☞");
				const link = doc.createElement("a");
				link.setAttribute(
					"href",
					`${TRANSLATION_FILENAME}#para-${targetIndex}`,
				);
				link.appendChild(linkText);
				para.appendChild(link);
				alignmentIndex++;
			}
			paraIndex++;
		}

		const newHtml = doc.toString();
		zip.file(filePath, newHtml);
	}

	return zip.generateAsync({ type: "arraybuffer" });
}

function htmlToParas(html: string): string[] {
	const domParser = new DOMParser();
	const doc = domParser.parseFromString(html, "text/html");
	const paras = doc.getElementsByTagName("p");
	return Array.from(paras)
		.map((para) => collapseWhitespace(para.textContent ?? ""))
		.filter((text) => text.length > 0);
}

function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function pathJoin(base: string, relative: string): string {
	if (base.trim().length === 0) {
		return relative;
	}

	// Split both paths into components
	const baseComponents = base.split("/");
	const relativeComponents = relative.split("/");

	// Iterate over each component in the relative path
	for (const component of relativeComponents) {
		if (component === "..") {
			// Go up one level
			baseComponents.pop();
		} else if (component !== ".") {
			// Go into subdirectory
			baseComponents.push(component);
		}
	}

	// Join all components back into a single string
	return baseComponents.join("/");
}

function parasHtml(groupedParas: string[][]): string {
	let text = "";
	let counter = 0;
	for (const group of groupedParas) {
		if (group.length < 1) {
			continue;
		}
		const [firstPara, ...paras] = group;
		const newPagePara = `<p class="new-page" id="para-${counter}">${firstPara}</p>`;
		const restParas = paras
			.map((para, n) => `<p id="para-${counter + n + 1}">${para}</p>`)
			.join("\n");
		text += `${newPagePara}\n${restParas}\n`;
		counter += group.length;
	}
	return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Bitextual translation</title>
  <style>
  .new-page {
    page-break-before: always;
    break-before: page;
}
  </style>
</head>
<body>
${text}
</body>
</html>`;
}

async function epubZipDom(
	parser: DOMParser,
	files: Record<string, JSZipObject>,
	filePath: string,
): Promise<Document> {
	const file = files[filePath];
	if (file === undefined) {
		throw new Error(`file not found at ${filePath}`);
	}
	const fileText = await file.async("text");
	return parser.parseFromString(fileText, "application/xml");
}

async function getRootPath(
	parser: DOMParser,
	files: Record<string, JSZipObject>,
): Promise<string> {
	const containerDom = await epubZipDom(
		parser,
		files,
		"META-INF/container.xml",
	);

	const rootPath = containerDom
		.getElementsByTagName("rootfile")[0]
		?.getAttribute("full-path");
	if (rootPath == null) {
		throw new Error(
			`rootPath not found in container DOM: ${containerDom.toString()}`,
		);
	}
	return rootPath;
}

async function* getSpineHtmls(
	files: Record<string, JSZipObject>,
	dom: Document,
	manifestMap: Map<string, string>,
	rootDir: string,
): AsyncGenerator<[string, string]> {
	const spine = dom.getElementsByTagName("spine")[0];
	if (spine === undefined) {
		throw new Error(`spine not found in DOM: ${dom.toString()}`);
	}
	const spineArr = Array.from(spine.getElementsByTagName("itemref"));
	for (const elem of spineArr) {
		const idref = elem.getAttribute("idref");
		if (idref === null) {
			console.error(`idref not found in spine element: ${elem.toString()}`);
			continue;
		}
		const filePath = manifestMap.get(idref);
		if (filePath === undefined) {
			console.error(`file with id ${idref} not found in manifest`);
			continue;
		}
		const fullPath = pathJoin(rootDir, filePath);
		const file = files[fullPath];
		if (file === undefined) {
			console.error(`file with at ${fullPath} not found.`);
			continue;
		}
		const text = await file.async("text");
		yield [fullPath, text] as const;
	}
}

function mkManifestMap(manifest: Element): Map<string, string> {
	const items = manifest.getElementsByTagName("item");
	const itemPairs = Array.from(items)
		.map((item, n) => {
			const id = item.getAttribute("id");
			if (id === null) {
				console.error(`id not found in manifest item ${n}: ${item.toString()}`);
				return null;
			}
			const href = item.getAttribute("href");
			if (href === null) {
				console.error(
					`href not found in manifest item ${n}: ${item.toString()}`,
				);
				return null;
			}
			return [id, href] as const;
		})
		.filter((item): item is [string, string] => item !== null);
	const itemMap = new Map(itemPairs);
	return itemMap;
}
