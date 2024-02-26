// Copyright (C) 2023 Wyden and Gyre, LLC
import { detectLang } from "@bitextual/core/detect-lang.js";

self.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
	const [sourceOrTarget, sampleText] = e.data;
	const detectedLanguage = detectLang(sampleText);
	if (typeof detectedLanguage === "string") {
		postMessage([sourceOrTarget, detectedLanguage]);
	} else {
		postMessage([sourceOrTarget, ["unsupported", detectedLanguage[1]]]);
	}
};
