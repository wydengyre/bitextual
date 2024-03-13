// Copyright (C) 2023 Wyden and Gyre, LLC
import { type AlignmentConfig, align } from "@bitextual/core/align.js";
import { epubToText } from "@bitextual/epub/epub.js";
import type { SubmitEvent } from "@bitextual/web-events/events.js";
import { expose } from "comlink";
import { buf } from "crc-32";
import { franc } from "franc-min";

export type { RenderAlignmentFn };

expose(renderAlignment);
type RenderAlignmentFn = typeof renderAlignment;

async function renderAlignment(
	domParser: DOMParser,
	source: File,
	target: File,
	metaArr: readonly (readonly [string, string])[],
): Promise<string> {
	const [sourceData, targetData] = await Promise.all([
		source.arrayBuffer(),
		target.arrayBuffer(),
	]);
	const [sourceText, targetText] = await Promise.all([
		epubToText(domParser, sourceData),
		epubToText(domParser, targetData),
	]);
	const sourceLang = franc(sourceText);
	const targetLang = franc(targetText);

	const meta = new Map(metaArr);
	const clientId = meta.get("clientId") ?? "unknown";
	meta.delete("clientId");
	const sourceCrc = buf(new Uint8Array(sourceData));
	const targetCrc = buf(new Uint8Array(targetData));
	const event: SubmitEvent = {
		clientId,
		sourceFile: source.name,
		sourceLang,
		sourceSize: sourceData.byteLength,
		sourceCrc,
		targetFile: target.name,
		targetSize: targetData.byteLength,
		targetLang,
		targetCrc,
	};

	const body = JSON.stringify(event);
	// purposely fire-and-forget
	fetch("/event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});

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
