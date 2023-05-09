// Copyright (C) 2023 Wyden and Gyre, LLC

// ensure async errors get handled just like sync errors
import { epubToText } from "./epub.js";

self.onunhandledrejection = (e: PromiseRejectionEvent) => {
  e.preventDefault();
  throw e.reason;
};

self.onmessage = async (e: MessageEvent<Uint8Array>) => {
  const epubData = e.data;
  const text = await epubToText(epubData);
  // can this be out of order somehow?
  postMessage(text);
};
