// Copyright (C) 2023 Wyden and Gyre, LLC
import { franc } from "franc-min";

self.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
	const [sourceOrTarget, sampleText] = e.data;
	const detectedLanguage = franc(sampleText);
	postMessage([sourceOrTarget, detectedLanguage]);
};
