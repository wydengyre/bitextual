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

// epubWorker.onmessage relies on DOM, so it's set up after DOM is loaded

epubWorker.onerror = (e: ErrorEvent) => {
  console.error(e);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}

function loadDom() {
  const sourceEpubButton = document.querySelector<HTMLButtonElement>(
    "button#import-epub-source",
  )!;
  const targetEpubButton = document.querySelector<HTMLButtonElement>(
    "button#import-epub-target",
  )!;
  const submitButton = document.querySelector<HTMLButtonElement>(
    "button#align",
  )!;

  const editorSource = new EditorView({
    extensions: [basicSetup, EditorView.lineWrapping],
    parent: document.getElementById("panel-source")!,
  });
  const editorTarget = new EditorView({
    extensions: [basicSetup, EditorView.lineWrapping],
    parent: document.getElementById("panel-target")!,
  });

  sourceEpubButton.addEventListener("click", importEpubSource);
  targetEpubButton.addEventListener("click", importEpubTarget);
  submitButton.addEventListener("click", submit);

  epubWorker.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
    const [sourceOrTarget, text] = e.data;
    const editor = sourceOrTarget === "source" ? editorSource : editorTarget;
    const { state } = editor;
    const update = state.update({
      changes: { from: 0, to: state.doc.length, insert: text },
    });
    editor.update([update]);
  };

  function submit(e: Event) {
    e.preventDefault();

    const sourceText = editorSource.state.doc.toString();
    const targetText = editorTarget.state.doc.toString();
    worker.postMessage([sourceText, targetText]);
  }
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
