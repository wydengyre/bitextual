// Copyright (C) 2023 Wyden and Gyre, LLC
/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as HunalignLib from "../resources/hunalign/web/hunalign.js";
import { Language, language } from "../lib/types.ts";
import { align, AlignmentConfig } from "../lib/align.ts";
import { detectLang, isUnsupportedLanguage } from "../lib/detect-lang.ts";

// ensure async errors get handled just like sync errors
self.onunhandledrejection = (e: PromiseRejectionEvent) => {
  e.preventDefault();
  throw e.reason;
};

self.onmessage = async (
  e: MessageEvent<[string, string]>,
) => {
  const [source, target] = e.data;
  const alignedHtml = await renderAlignment(source, target);
  postMessage(alignedHtml);
};

async function renderAlignment(
  source: string,
  target: string,
): Promise<string> {
  const sourceLanguage = detectLang(source);
  // TODO: handle this through messages rather than the error mechanism
  if (isUnsupportedLanguage(sourceLanguage)) {
    throw Error(`Unsupported source language: ${sourceLanguage[1]}`);
  }
  const targetLanguage = detectLang(target);
  if (isUnsupportedLanguage(targetLanguage)) {
    throw Error(`Unsupported target language: ${targetLanguage[1]}`);
  }
  const sourceLangCode = language[sourceLanguage];
  const targetLangCode = language[targetLanguage];

  const [punktSourceTrainingData, punktTargetTrainingData] = await Promise.all([
    getTrainingData(sourceLangCode),
    getTrainingData(targetLangCode),
  ]);
  const [punktWasm, hunalignWasm] = await Promise.all([
    fetchBinary(`punkt/punkt_bg.wasm`),
    fetchBinary(`hunalign.wasm`),
  ]);

  const hunalignLib = await HunalignLib.Hunalign.create(hunalignWasm);
  const hunalignDictData = await fetchBinary(
    `dictionaries/${targetLangCode}-${sourceLangCode}.dic`,
  );

  const alignConfig: AlignmentConfig = {
    sourceLanguage,
    targetLanguage,
    punktWasm,
    punktSourceTrainingData,
    punktTargetTrainingData,
    hunalignLib,
    hunalignDictData,
  };

  return align(source, target, alignConfig);
}

function getTrainingData(l: Language): Promise<Uint8Array> {
  const languageData: Map<Language, string> = new Map([
    ["en", "english"],
    ["fr", "french"],
    ["it", "italian"],
    ["es", "spanish"],
  ]);
  const languageName = languageData.get(l)!;
  const languageFileName = `${languageName}.json`;
  return fetchBinary(`punkt/data/${languageFileName}`);
}

async function fetchBinary(url: string): Promise<Uint8Array> {
  const f = await fetch(url);
  if (!f.ok) {
    throw Error(`Failed to fetch ${url}: ${f.status} ${f.statusText}`);
  }
  const ab = await f.arrayBuffer();
  return new Uint8Array(ab);
}
