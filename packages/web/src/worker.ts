// Copyright (C) 2023 Wyden and Gyre, LLC
import {
	type AlignmentConfig,
	alignParas,
	alignTexts,
} from "@bitextual/core/align.js";
import {
	epubParas,
	epubToText,
	generateAlignedEpub,
} from "@bitextual/core/epub.js";
import type { SubmitEvent } from "@bitextual/web-events/events.js";
import { expose } from "comlink";
import { buf } from "crc-32";
import { franc } from "franc-min";

export type { Worker, RenderAlignmentFn, RenderEpubFn };

expose({
	renderAlignment,
	renderEpub,
});

type Worker = {
	renderAlignment: RenderAlignmentFn;
	renderEpub: RenderEpubFn;
};
type RenderAlignmentFn = typeof renderAlignment;
type RenderEpubFn = typeof renderEpub;

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
	return alignTexts(sourceText, targetText, alignConfig);
}

async function renderEpub(
	source: File,
	target: File,
	metaArr: readonly (readonly [string, string])[],
): Promise<Uint8Array> {
	const [sourceData, targetData] = await Promise.all([
		source.arrayBuffer(),
		target.arrayBuffer(),
	]);
	const [sourceParas, targetParas] = await Promise.all([
		toArray(epubParas(sourceData)),
		toArray(epubParas(targetData)),
	]);

	const sourceText = sourceParas.join("\n");
	const sourceLang = franc(sourceText);
	const targetText = targetParas.join("\n");
	const targetLang = franc(targetText);

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
		"epub",
	);

	const hunalignDictData = await fetchDictionary(sourceLang, targetLang);

	const alignConfig: AlignmentConfig = {
		sourceLang,
		targetLang,
		hunalignDictData,
		meta,
	};

	const aligned = await alignParas(sourceParas, targetParas, alignConfig);
	const epub = await generateAlignedEpub(aligned, sourceData);
	return new Uint8Array(epub);
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

async function toArray<T>(asyncGen: AsyncGenerator<T>): Promise<T[]> {
	const res: T[] = [];
	for await (const item of asyncGen) {
		res.push(item);
	}
	return res;
}
