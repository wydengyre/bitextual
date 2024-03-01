import { AlignmentConfig, align } from "@bitextual/core/align.js";
// Copyright (C) 2023 Wyden and Gyre, LLC
import { LanguageName, language } from "@bitextual/core/language.js";
import * as HunalignLib from "@bitextual/hunalign";

// ensure async errors get handled just like sync errors
self.onunhandledrejection = (e: PromiseRejectionEvent) => {
	e.preventDefault();
	throw new Error(e.reason);
};

self.onmessage = async (
	e: MessageEvent<[LanguageName, LanguageName, string, string]>,
) => {
	const [sourceLang, targetLang, source, target] = e.data;
	const alignedHtml = await renderAlignment(
		sourceLang,
		targetLang,
		source,
		target,
	);
	postMessage(alignedHtml);
};

async function renderAlignment(
	sourceLang: LanguageName,
	targetLang: LanguageName,
	source: string,
	target: string,
): Promise<string> {
	const sourceLangCode = language[sourceLang];
	const targetLangCode = language[targetLang];

	const hunalignWasm = await fetchBinary("hunalign/hunalign.wasm");
	const hunalignLib = await HunalignLib.Hunalign.create(hunalignWasm);
	const hunalignDictData = await fetchBinary(
		`hunalign/dictionaries/${targetLangCode}-${sourceLangCode}.dic`,
	);

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignLib,
		hunalignDictData,
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
