const worker = new Worker("worker.js");
const epubWorker = new Worker("epub-worker.js");

worker.onmessage = (e: MessageEvent<string>) => {
  // generate a page containing the HTML in e.data and navigate to it
  const blob = new Blob([e.data], { type: "text/html" });
  window.location.href = URL.createObjectURL(blob);
};

worker.onerror = (e: ErrorEvent) => {
  console.error(e);
};

epubWorker.onmessage = (e: MessageEvent<string>) => {
  console.log(`got epub: ${e.data}`);
};

epubWorker.onerror = (e: ErrorEvent) => {
  console.error(e);
};

const $unloaded = Symbol("unloaded");
type Unloaded = typeof $unloaded;

let sourceTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let targetTextArea: HTMLTextAreaElement | Unloaded = $unloaded;
let epubButton: HTMLButtonElement | Unloaded = $unloaded;
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

  e = document.querySelector("button#import-epub-source")!;
  if (!(e instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  epubButton = e;
  epubButton.addEventListener("click", importEpub);

  e = document.querySelector("button#align")!;
  if (!(e instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  submitButton = e;
  submitButton.addEventListener("click", submit);
}

function importEpub(e: Event) {
  e.preventDefault();

  // pop up a file selector and store the bytes of the selected epub
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".epub";
  input.addEventListener("change", async (e: Event) => {
    const file = (e.target as HTMLInputElement).files![0];
    if (!file) {
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    epubWorker.postMessage(bytes);
  });
  input.click();
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
