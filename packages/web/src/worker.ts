// Copyright (C) 2023 Wyden and Gyre, LLC
import { AlignmentConfig, align } from "@bitextual/core/align.js";

// ensure async errors get handled just like sync errors
self.onunhandledrejection = (e: PromiseRejectionEvent) => {
	e.preventDefault();
	throw new Error(e.reason);
};

self.onmessage = async (
	e: MessageEvent<[string, string, string, string, [string, string][]]>,
) => {
	const [sourceLang, targetLang, source, target, metaArr] = e.data;
	const meta = new Map(metaArr);
	const alignedHtml = await renderAlignment(
		sourceLang,
		targetLang,
		source,
		target,
		meta,
	);
	postMessage(alignedHtml);
};

async function renderAlignment(
	sourceLang: string,
	targetLang: string,
	source: string,
	target: string,
	meta: Map<string, string>,
): Promise<string> {
	const dictUrl = `dictionaries/${targetLang}-${sourceLang}.dic`;
	const hunalignDictData = await (async () => {
		try {
			return await fetchBinary(dictUrl);
		} catch (e) {
			console.error(`couldn't get dictionary at ${dictUrl}`, e);
			return Uint8Array.of();
		}
	})();

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
		meta,
	};

	return align(source, target, alignConfig);
}

async function fetchBinary(url: string): Promise<Uint8Array> {
	const f = await fetch(url);
	if (!f.ok) {
		throw Error(`Failed to fetch ${url}: ${f.status} ${f.statusText}`);
	}
	const ab = await f.arrayBuffer();
	return new Uint8Array(ab);
}
