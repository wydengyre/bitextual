import { DOMParser } from "@xmldom/xmldom";
import { compile as compileHtmlConvert } from "html-to-text";
import JSZip from "jszip";

export { epubToText };

async function epubToText(epubBytes: Uint8Array): Promise<string> {
	const zip = await JSZip.loadAsync(epubBytes);
	const files = zip.files;
	const containerPath = "META-INF/container.xml";
	const container = files[containerPath];
	if (container === undefined) {
		throw new Error(`${containerPath} not found`);
	}
	const containerTxt = await container.async("text");

	const containerDom = new DOMParser().parseFromString(
		containerTxt,
		"application/xml",
	);
	if (containerDom === undefined) {
		throw new Error(`failed to parse XML DOM from ${containerTxt}`);
	}

	const rootPath = containerDom
		.getElementsByTagName("rootfile")[0]
		?.getAttribute("full-path");
	if (rootPath == null) {
		throw new Error(`rootPath not found in DOM: ${containerDom.toString()}`);
	}
	const rootDir = rootPath.split("/").slice(0, -1).join("/");

	const opf = files[rootPath];
	if (opf === undefined) {
		throw new Error(`opf file not found at ${rootPath}`);
	}
	const opfTxt = await opf.async("text");
	const opfDom = new DOMParser().parseFromString(opfTxt, "application/xml");
	if (opfDom === undefined) {
		throw new Error(`failed to parse XML DOM from ${opfTxt}`);
	}

	const spineElems = opfDom
		.getElementsByTagName("package")[0]
		?.getElementsByTagName("spine")[0]
		?.getElementsByTagName("itemref");
	if (spineElems === undefined) {
		throw new Error(`spine not found in DOM: ${opfDom.toString()}`);
	}
	const spine = Array.from(spineElems).map((item, n) => {
		const idref = item.getAttribute("idref");
		if (idref === null) {
			throw new Error(
				`idref not found in spine element ${n}: ${item.toString()}`,
			);
		}
		return idref;
	});

	const manifest = opfDom.getElementsByTagName("manifest")[0];
	if (manifest === undefined) {
		throw new Error(`manifest not found in DOM: ${opfDom.toString()}`);
	}
	const manifestItems = Array.from(manifest.getElementsByTagName("item")).map(
		(item, n) => {
			const id = item.getAttribute("id");
			if (id === null) {
				throw new Error(
					`id not found in manifest item ${n}: ${item.toString()}`,
				);
			}
			const href = item.getAttribute("href");
			if (href === null) {
				throw new Error(
					`href not found in manifest item ${n}: ${item.toString()}`,
				);
			}
			return [id, href] as const;
		},
	);
	const manifestMap: Map<string, string> = new Map(manifestItems);

	const orderedFiles = spine.map((id) => {
		const file = manifestMap.get(id);
		if (file === undefined) {
			throw new Error(`file with id ${id} not found in manifest`);
		}
		return [id, file] as const;
	});
	const htmlPromises = [...orderedFiles.values()].map(([id, path]) => {
		const fullPath = pathJoin(rootDir, path);
		const file = files[fullPath];
		if (file === undefined) {
			throw new Error(
				`file with id ${id} at ${fullPath} (resolved from root ${rootDir} and relative path ${path}) not found.
        rootPath: "${rootPath}"`,
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
	const epubText = htmls.map((html) => htmlToText(html)).join("\n");
	return processLineBreaks(epubText);
}

function processLineBreaks(text: string): string {
	const normalizedText = text.replace(/\r\n/g, "\n");
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