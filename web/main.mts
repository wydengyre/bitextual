import { basicSetup, EditorView } from "codemirror";

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

epubWorker.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
  const [sourceOrTarget, text] = e.data;
  const editor = sourceOrTarget === "source" ? editorSource : editorTarget;
  if (editor === $unloaded) {
    throw new Error("DOM not loaded");
  }
  const { state } = editor;
  const update = state.update({
    changes: { from: 0, to: state.doc.length, insert: text },
  });
  editor.update([update]);
};

epubWorker.onerror = (e: ErrorEvent) => {
  console.error(e);
};

const $unloaded = Symbol("unloaded");
type Unloaded = typeof $unloaded;

let submitButton: HTMLButtonElement | Unloaded = $unloaded;
let editorSource: EditorView | Unloaded = $unloaded;
let editorTarget: EditorView | Unloaded = $unloaded;

function loadDom() {
  const sourceEpubButton = document.querySelector("button#import-epub-source")!;
  if (!(sourceEpubButton instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  sourceEpubButton.addEventListener("click", importEpubSource);

  const targetEpubButton = document.querySelector("button#import-epub-target")!;
  if (!(targetEpubButton instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  targetEpubButton.addEventListener("click", importEpubTarget);

  const e = document.querySelector("button#align")!;
  if (!(e instanceof HTMLButtonElement)) {
    throw "button is not a button";
  }
  submitButton = e;
  submitButton.addEventListener("click", submit);

  editorSource = new EditorView({
    extensions: [basicSetup, EditorView.lineWrapping],
    parent: document.getElementById("panel-source")!,
  });

  editorTarget = new EditorView({
    extensions: [basicSetup, EditorView.lineWrapping],
    parent: document.getElementById("panel-target")!,
  });
}

function importEpubSource(e: Event) {
  e.preventDefault();
  importEpub("source");
}

function importEpubTarget(e: Event) {
  e.preventDefault();
  importEpub("target");
}

function importEpub(sourceOrTarget: "source" | "target") {
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
    epubWorker.postMessage([sourceOrTarget, bytes]);
  });
  input.click();
}

function submit(e: Event) {
  e.preventDefault();

  if (editorSource === $unloaded || editorTarget === $unloaded) {
    throw new Error("DOM not loaded. This should never happen.");
  }

  const sourceText = editorSource.state.doc.toString();
  const targetText = editorTarget.state.doc.toString();
  worker.postMessage([sourceText, targetText]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}
