import { basicSetup, EditorView } from "codemirror";
import { placeholder, ViewUpdate } from "@codemirror/view";
import { debounce } from "lodash-es";

const WORKER_PATH = "worker.js";
const EPUB_WORKER_PATH = "epub-worker.js";
const LANG_WORKER_PATH = "lang-worker.js";

const INITIAL_SOURCE_TEXT =
  `Paste your source text here, with each paragraph a single line.
You can also use the epub import button, above.`;

const INITIAL_TARGET_TEXT =
  `Paste your target text here, with each paragraph on a single line.
You can also use the epub import button, above.`;

const worker = new Worker(WORKER_PATH);
const epubWorker = new Worker(EPUB_WORKER_PATH);
const langWorker = new Worker(LANG_WORKER_PATH);

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

// langWorker.onmessage relies on DOM, so it's set up after DOM is loaded
langWorker.onerror = (e: ErrorEvent) => {
  console.error(e);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}

function loadDom() {
  const buttons = ["import-epub-source", "import-epub-target", "align"].map(
    (id) => document.querySelector<HTMLButtonElement>(`button#${id}`)!,
  );
  const [sourceEpubButton, targetEpubButton, submitButton] = buttons;

  const editorSource = new EditorView({
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      placeholder(INITIAL_SOURCE_TEXT),
      mkLanguageUpdateListener("source"),
    ],
    parent: document.getElementById("panel-source")!,
  });
  const editorTarget = new EditorView({
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      placeholder(INITIAL_TARGET_TEXT),
      mkLanguageUpdateListener("target"),
    ],
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

  langWorker.onmessage = (
    e: MessageEvent<["source" | "target", string | ["unsupported", string]]>,
  ) => {
    const [sourceOrTarget, lang] = e.data;
    if (Array.isArray(lang)) {
      console.error("Unsupported language", lang[1]);
      return;
    }
    console.log(`got ${sourceOrTarget} language`, lang);
  };

  sourceEpubButton.disabled = false;
  targetEpubButton.disabled = false;

  function mkLanguageUpdateListener(sourceOrTarget: "source" | "target") {
    // we don't want to spam the worker
    const DEBOUNCE_MS = 200;
    const debouncedPostMessage = debounce(postMessage, DEBOUNCE_MS);

    return EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        const doc = update.state.doc;
        debouncedPostMessage(doc.toString());

        const otherEditor = sourceOrTarget === "source"
          ? editorTarget
          : editorSource;
        if (doc.length > 0) {
          if (otherEditor.state.doc.length > 0) {
            submitButton.disabled = false;
          }
        } else {
          submitButton.disabled = true;
        }
      }
    });

    function postMessage(text: string) {
      langWorker.postMessage([sourceOrTarget, text]);
    }
  }

  function submit(this: HTMLButtonElement, e: Event) {
    e.preventDefault();

    this.classList.add("loading");
    this.disabled = true;

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
