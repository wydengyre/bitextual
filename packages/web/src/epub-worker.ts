// Copyright (C) 2023 Wyden and Gyre, LLC
import { epubToText } from "@bitextual/epub/epub.js";

self.onunhandledrejection = (e: PromiseRejectionEvent) => {
	e.preventDefault();
	throw new Error(e.reason);
};

self.onmessage = async (e: MessageEvent<["source" | "target", File]>) => {
	const [sourceOrTarget, epubData] = e.data;
	const ab = await epubData.arrayBuffer();
	const text = await epubToText(ab);
	// can this be out of order somehow?
	postMessage([sourceOrTarget, text]);
};
