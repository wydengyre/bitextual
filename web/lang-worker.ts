// Copyright (C) 2023 Wyden and Gyre, LLC
/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { detectLang } from "../lib/detect-lang.ts";

self.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
  const [sourceOrTarget, sampleText] = e.data;
  const detectedLanguage = detectLang(sampleText);
  if (typeof detectedLanguage === "string") {
    postMessage([sourceOrTarget, detectedLanguage]);
  } else {
    postMessage([sourceOrTarget, ["unsupported", detectedLanguage[1]]]);
  }
};
