const worker = new Worker("worker.js");
worker.onmessage = (e: MessageEvent<string>) => {
  // generate a page containing the HTML in e.data and navigate to it
  const blob = new Blob([e.data], { type: "text/html" });
  window.location.href = URL.createObjectURL(blob);
};

worker.onerror = (e: ErrorEvent) => {
  // TODO: improve this error handling
  console.error(e);
  alert(e.message);
}

const $unloaded = Symbol("unloaded");
type Unloaded = typeof $unloaded;

let sourceTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let targetTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let submitButton: HTMLButtonElement | Unloaded = $unloaded;

function loadDom() {
  let e = document.querySelector("#source-text")!;
  if (!(e instanceof HTMLTextAreaElement)) {
    throw "source-text is not a textarea";
  }
  sourceTextArea = e;

  e = document.querySelector("#target-text")!;
  if (!(e instanceof HTMLTextAreaElement)) {
    throw "target-text is not a textarea";
  }
  targetTextArea = e;

  e = document.querySelector("button")!;
  if (!(e instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  submitButton = e;
  submitButton.addEventListener("click", submit);
}

function submit(e: Event) {
  e.preventDefault();

  if (sourceTextArea === $unloaded) {
    throw "Source language DOM unloaded. This should never happen.";
  }
  if (targetTextArea === $unloaded) {
    throw "Target language DOM unloaded. This should never happen.";
  }

  worker.postMessage([sourceTextArea.value, targetTextArea.value]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}
