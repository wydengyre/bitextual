import { DOMParser } from "@xmldom/xmldom";
import { compile as compileHtmlConvert } from "html-to-text";
import JSZip, { type JSZipObject } from "jszip";

export { epubToText };

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
