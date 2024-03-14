import { DOMParser } from "@xmldom/xmldom";
import { compile as compileHtmlConvert } from "html-to-text";
import JSZip, { type JSZipObject } from "jszip";

export { epubToText };

async function epubToText(epubBytes: ArrayBuffer): Promise<string> {
	const domParser = new DOMParser();
	const zip = await JSZip.loadAsync(epubBytes);
	const files = zip.files;
	const containerPath = "META-INF/container.xml";
	const containerDom = await epubZipDom(domParser, files, containerPath);

	const rootPath = containerDom
		.getElementsByTagName("rootfile")[0]
		?.getAttribute("full-path");
	if (rootPath == null) {
		throw new Error(
			`rootPath not found in container DOM: ${containerDom.toString()}`,
		);
	}
	const rootDir = rootPath.split("/").slice(0, -1).join("/");

	const opfDom = await epubZipDom(domParser, files, rootPath);

	const manifest = opfDom.getElementsByTagName("manifest")[0];
	if (manifest === undefined) {
		throw new Error(`manifest not found in DOM: ${opfDom.toString()}`);
	}
	const manifestItems = Array.from(manifest.getElementsByTagName("item"))
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
	const manifestMap: Map<string, string> = new Map(manifestItems);

	const spineElems = opfDom
		.getElementsByTagName("spine")[0]
		?.getElementsByTagName("itemref");
	if (spineElems === undefined) {
		throw new Error(`spine not found in DOM: ${opfDom.toString()}`);
	}

	const htmlToText = compileHtmlConvert({
		selectors: [
			// don't include links in text
			{ selector: "a", options: { ignoreHref: true } },
			// don't include images in text
			{ selector: "img", format: "skip" },
		],
		wordwrap: false,
	});
	const textPromises = Array.from(spineElems).map(async (item, n) => {
		const idref = item.getAttribute("idref");
		if (idref === null) {
			console.error(
				`idref not found in spine element ${n}: ${item.toString()}`,
			);
			return null;
		}
		const filePath = manifestMap.get(idref);
		if (filePath === undefined) {
			console.error(`file not found in manifest for idref ${idref}`);
			return null;
		}
		const fullPath = pathJoin(rootDir, filePath);
		const file = files[fullPath];
		if (file === undefined) {
			console.error(
				`file with id ${idref} at ${fullPath} (resolved from root ${rootDir} and relative path ${filePath}) not found.
        rootPath: "${rootPath}"`,
			);
			return null;
		}
		const fileText = await file.async("text");
		return htmlToText(fileText);
	});

	const epubTexts = await Promise.all(textPromises);
	const epubText = epubTexts
		.filter((maybeText): maybeText is string => maybeText !== null)
		.join("\n");
	const normalizedText = epubText.replace(/\r\n/g, "\n");
	return normalizedText.replace(/\n+/g, "\n").trim();
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
