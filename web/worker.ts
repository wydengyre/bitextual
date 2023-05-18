// Copyright (C) 2023 Wyden and Gyre, LLC
/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as HunalignLib from "../resources/hunalign/web/hunalign.js";
import { language, LanguageName } from "../lib/types.ts";
import { align, AlignmentConfig } from "../lib/align.ts";

// ensure async errors get handled just like sync errors
self.onunhandledrejection = (e: PromiseRejectionEvent) => {
  e.preventDefault();
  throw e.reason;
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

  const [punktSourceTrainingData, punktTargetTrainingData] = await Promise.all([
    getTrainingData(sourceLang),
    getTrainingData(targetLang),
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
    sourceLang,
    targetLang,
    punktWasm,
    punktSourceTrainingData,
    punktTargetTrainingData,
    hunalignLib,
    hunalignDictData,
  };

  return align(source, target, alignConfig);
}

function getTrainingData(languageName: LanguageName): Promise<Uint8Array> {
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
