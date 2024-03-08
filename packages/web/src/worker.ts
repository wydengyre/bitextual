import { type AlignmentConfig, align } from "@bitextual/core/align.js";
import { epubToText } from "@bitextual/epub/epub.js";
// Copyright (C) 2023 Wyden and Gyre, LLC
import { expose } from "comlink";
import { franc } from "franc-min";

export type { RenderAlignmentFn };

expose(renderAlignment);
type RenderAlignmentFn = typeof renderAlignment;

async function renderAlignment(
	source: File,
	target: File,
	metaArr: readonly (readonly [string, string])[],
): Promise<string> {
	const [sourceData, targetData] = await Promise.all([
		source.arrayBuffer(),
		target.arrayBuffer(),
	]);
	const [sourceText, targetText] = await Promise.all([
		epubToText(sourceData),
		epubToText(targetData),
	]);
	const sourceLang = franc(sourceText);
	const targetLang = franc(targetText);

	const dictUrl = `dictionaries/${targetLang}-${sourceLang}.dic`;
	const hunalignDictData = await (async () => {
		try {
			return await fetchBinary(dictUrl);
		} catch (e) {
			console.error(`couldn't get dictionary at ${dictUrl}`, e);
			return Uint8Array.of();
		}
	})();
	const meta = new Map(metaArr);
	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
		meta,
	};
	return align(sourceText, targetText, alignConfig);
}

async function fetchBinary(url: string): Promise<Uint8Array> {
	const f = await fetch(url);
	if (!f.ok) {
		throw Error(`Failed to fetch ${url}: ${f.status} ${f.statusText}`);
	}
	const ab = await f.arrayBuffer();
	return new Uint8Array(ab);
}
