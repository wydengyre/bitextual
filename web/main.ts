import { isLanguage, LanguageTaggedText } from "../lib/types.ts";

performance.mark("worker_load_start");
const worker = new Worker("worker.js");
performance.mark("worker_load_end");
const workerLoad = performance.measure(
  "worker_load",
  "worker_load_start",
  "worker_load_end",
);
console.debug(workerLoad);

worker.onmessage = (e: MessageEvent<[string, string]>) => {
  console.log(e.data);
};

// TODO: errors

const $unloaded = Symbol("unloaded");
type Unloaded = typeof $unloaded;

let sourceTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let sourceLanguageSelect: HTMLSelectElement | Unloaded = $unloaded;
let targetTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let targetLanguageSelect: HTMLSelectElement | Unloaded = $unloaded;
let submitButton: HTMLButtonElement | Unloaded = $unloaded;

function loadDom() {
  sourceTextArea = document.querySelector("#source-text")!;
  sourceLanguageSelect = document.querySelector("#source-language")!;
  targetTextArea = document.querySelector("#target-text")!;
  targetLanguageSelect = document.querySelector("#target-language")!;
  submitButton = document.querySelector("button")!;
  submitButton.addEventListener("click", submit);
}

function submit(e: Event) {
  e.preventDefault();
  const selections = [
    targetTextArea.value,
    targetLanguageSelect.value,
  ];

  if (!isLanguage(sourceLanguageSelect.value)) {
    throw `invalid source language: ${sourceLanguageSelect.value}`;
  }
  if (!isLanguage(targetLanguageSelect.value)) {
    throw `invalid target language: ${targetLanguageSelect.value}`;
  }

  const source: LanguageTaggedText = [
    sourceLanguageSelect.value,
    sourceTextArea.value,
  ];
  const target: LanguageTaggedText = [
    targetLanguageSelect.value,
    targetTextArea.value,
  ];
  worker.postMessage([source, target]);
  console.log(selections.join("\n"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}
