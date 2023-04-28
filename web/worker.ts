// Copyright (C) 2023 Wyden and Gyre, LLC
/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as HunalignLib from "../resources/hunalign/web/hunalign.js";
import { Language } from "../lib/types.ts";
import { align, AlignmentConfig } from "../lib/align.ts";

type LanguageTaggedText = [Language, string];

self.onmessage = async (
  e: MessageEvent<[LanguageTaggedText, LanguageTaggedText]>,
) => {
  const [source, target] = e.data;
  const alignedHtml = await renderAlignment(source, target);
  postMessage(alignedHtml);
};

async function renderAlignment(
  [sourceLang, sourceText]: LanguageTaggedText,
  [targetLang, targetText]: LanguageTaggedText,
): Promise<string> {
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
    `dictionaries/${targetLang}-${sourceLang}.dic`,
  );

  const alignConfig: AlignmentConfig = {
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    punktWasm,
    punktSourceTrainingData,
    punktTargetTrainingData,
    hunalignLib,
    hunalignDictData,
  };

  return align(sourceText, targetText, alignConfig);
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
  const ab = await f.arrayBuffer();
  return new Uint8Array(ab);
}
