import { isLanguage, LanguageTaggedText } from "../lib/types.js";

performance.mark("worker_load_start");
const worker = new Worker("worker.js");
performance.mark("worker_load_end");
const workerLoad = performance.measure(
  "worker_load",
  "worker_load_start",
  "worker_load_end",
);
console.debug(workerLoad);

worker.onmessage = (e: MessageEvent<[string[], string[]]>) => {
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
  sourceTextArea = document.querySelector("#source-text")!
    .getElementsByTagName("textarea")[0]!;
  sourceLanguageSelect = document.querySelector("#source-language")!
    .getElementsByTagName("select")[0]!;
  targetTextArea = document.querySelector("#target-text")!
    .getElementsByTagName("textarea")[0]!;
  targetLanguageSelect = document.querySelector("#target-language")!
    .getElementsByTagName("select")[0]!;
  submitButton = document.querySelector("button")!
    .getElementsByTagName("button")[0]!;
  submitButton.addEventListener("click", submit);
}

function submit(e: Event) {
  e.preventDefault();

  if (sourceLanguageSelect === $unloaded) {
    throw "Source language selector DOM Unloaded. This should never happen.";
  }
  if (targetLanguageSelect === $unloaded) {
    throw "Target language selector DOM Unloaded. This should never happen.";
  }
  if (sourceTextArea === $unloaded) {
    throw "Source language DOM unloaded. This should never happen.";
  }
  if (targetTextArea === $unloaded) {
    throw "Target language DOM unloaded. This should never happen.";
  }

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}
