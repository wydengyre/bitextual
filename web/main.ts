const $unloaded = Symbol("unloaded");
type Unloaded = typeof $unloaded;

let sourceTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let sourceLanguageSelect: HTMLSelectElement | Unloaded = $unloaded;
let translatedTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let translatedLanguageSelect: HTMLSelectElement | Unloaded = $unloaded;
let submitButton: HTMLButtonElement | Unloaded = $unloaded;

function loadDom() {
  sourceTextArea = document.querySelector("#source-text")!;
  sourceLanguageSelect = document.querySelector("#source-language")!;
  translatedTextArea = document.querySelector("#translated-text")!;
  translatedLanguageSelect = document.querySelector("#translated-language")!;
  submitButton = document.querySelector("button")!;
  submitButton.addEventListener("click", submit);
}

function submit(e: Event) {
  e.preventDefault();
  const selections = [
    sourceTextArea.value,
    sourceLanguageSelect.value,
    translatedTextArea.value,
    translatedLanguageSelect.value,
  ];
  console.log(selections.join("\n"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}
