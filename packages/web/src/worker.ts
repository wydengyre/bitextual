// Copyright (C) 2023 Wyden and Gyre, LLC
import { type AlignmentConfig, alignTexts } from "@bitextual/core/align.ts";
import { epubToText } from "@bitextual/core/epub.ts";
import type { SubmitEvent } from "@bitextual/web-events/events.ts";
import { expose } from "comlink";
import { buf } from "crc-32";
import { franc } from "franc-min";

export type { Worker, RenderAlignmentFn };

expose({ renderAlignment });

type Worker = { renderAlignment: RenderAlignmentFn };
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
	const sourceLang = franc(sourceText.text);
	const targetLang = franc(targetText.text);

	const meta = new Map(metaArr);
	const clientId = meta.get("clientId") ?? "unknown";
	meta.delete("clientId");
	// purposely fire and forget
	submitEvent(
		clientId,
		sourceData,
		targetData,
		source.name,
		target.name,
		sourceLang,
		targetLang,
		"html",
	);

	const hunalignDictData = await fetchDictionary(sourceLang, targetLang);

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
		meta,
	};
	return alignTexts(
		sourceText.title,
		sourceText.text,
		targetText.text,
		alignConfig,
	);
}

async function fetchDictionary(sourceLang: string, targetLang: string) {
	const dictUrl = `dictionaries/${targetLang}-${sourceLang}.dic`;
	try {
		return await fetchBinary(dictUrl);
	} catch (e) {
		console.error(`couldn't get dictionary at ${dictUrl}`, e);
		return Uint8Array.of();
	}
}

async function fetchBinary(url: string): Promise<Uint8Array> {
	const f = await fetch(url);
	if (!f.ok) {
		throw Error(`Failed to fetch ${url}: ${f.status} ${f.statusText}`);
	}
	const ab = await f.arrayBuffer();
	return new Uint8Array(ab);
}

function submitEvent(
	clientId: string,
	sourceData: ArrayBuffer,
	targetData: ArrayBuffer,
	sourceFile: string,
	targetFile: string,
	sourceLang: string,
	targetLang: string,
	format: "epub" | "html",
) {
	const sourceCrc = buf(new Uint8Array(sourceData));
	const targetCrc = buf(new Uint8Array(targetData));
	const event: SubmitEvent = {
		clientId,
		sourceFile,
		sourceLang,
		sourceSize: sourceData.byteLength,
		sourceCrc,
		targetFile,
		targetSize: targetData.byteLength,
		targetLang,
		targetCrc,
		format,
	};
	const body = JSON.stringify(event);
	return fetch("/event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});
}
