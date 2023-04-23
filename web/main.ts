import { isLanguage, Language } from "../lib/types.js";

type LanguageTaggedText = [Language, string];

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
  let e = document.querySelector("#source-text")!;
  if (!(e instanceof HTMLTextAreaElement)) {
    throw "source-text is not a textarea";
  }
  sourceTextArea = e;

  e = document.querySelector("#source-language")!;
  if (!(e instanceof HTMLSelectElement)) {
    throw "source-language is not a select";
  }
  sourceLanguageSelect = e;

  e = document.querySelector("#target-text")!;
  if (!(e instanceof HTMLTextAreaElement)) {
    throw "target-text is not a textarea";
  }
  targetTextArea = e;

  e = document.querySelector("#target-language")!;
  if (!(e instanceof HTMLSelectElement)) {
    throw "target-language is not a select";
  }
  targetLanguageSelect = e;

  e = document.querySelector("button")!;
  if (!(e instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  submitButton = e;
  submitButton.addEventListener("click", submit);
}

function submit(e: Event) {
  e.preventDefault();

  if (sourceLanguageSelect === $unloaded) {
    throw "Source language selector DOM unloaded. This should never happen.";
  }
  if (targetLanguageSelect === $unloaded) {
    throw "Target language selector DOM unloaded. This should never happen.";
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
