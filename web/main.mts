import { basicSetup, EditorView } from "codemirror";
import type { Text } from "@codemirror/state";
import { placeholder, ViewUpdate } from "@codemirror/view";
import { capitalize, debounce } from "lodash-es";

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

const IMPORT_EPUB_SOURCE_SELECTOR = "#import-epub-source";
const IMPORT_EPUB_TARGET_SELECTOR = "#import-epub-target";
const ALIGN_SELECTOR = "#align";

const SOURCE_LANG_ID = "source-detected-language";
const TARGET_LANG_ID = "target-detected-language";

const SOURCE_PANEL_ID = "panel-source";
const TARGET_PANEL_ID = "panel-target";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}

function loadDom() {
  const buttons = [
    IMPORT_EPUB_SOURCE_SELECTOR,
    IMPORT_EPUB_TARGET_SELECTOR,
    ALIGN_SELECTOR,
  ].map(
    (selector) => document.querySelector<HTMLButtonElement>(selector)!,
  );
  const [sourceEpubButton, targetEpubButton, submitButton] = buttons;

  const domSourceLang = document.getElementById(SOURCE_LANG_ID)!;
  const domTargetLang = document.getElementById(TARGET_LANG_ID)!;

  const sourcePanel = document.getElementById(SOURCE_PANEL_ID)!;
  const targetPanel = document.getElementById(TARGET_PANEL_ID)!;

  const editorSource = mkEditorView("source", INITIAL_SOURCE_TEXT, sourcePanel);
  const editorTarget = mkEditorView("target", INITIAL_TARGET_TEXT, targetPanel);

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
    const updateFn = sourceOrTarget === "source"
      ? updateSourceLanguage
      : updateTargetLanguage;
    if (Array.isArray(lang)) {
      console.debug(`unsupported ${sourceOrTarget} language`, lang[1]);
      updateFn("unsupported language", false);
    } else {
      updateFn(capitalize(lang), true);
    }
  };

  sourceEpubButton.disabled = false;
  targetEpubButton.disabled = false;

  function mkEditorView(
    sourceOrTarget: "source" | "target",
    initialText: string,
    parent: HTMLElement,
  ): EditorView {
    return new EditorView({
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        placeholder(initialText),
        mkLanguageUpdateListener(sourceOrTarget),
      ],
      parent,
    });
  }

  function mkLanguageUpdateListener(sourceOrTarget: "source" | "target") {
    // we don't want to spam the worker
    const DEBOUNCE_MS = 200;
    const debouncedPostMessage = debounce(postMessage, DEBOUNCE_MS);

    return EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        docChanged(update.state.doc);
      }
    });

    function docChanged(doc: Text) {
      if (doc.length > 0) {
        debouncedPostMessage(doc.toString());
      } else {
        if (sourceOrTarget === "source") {
          updateSourceLanguage("empty", false);
        } else {
          updateTargetLanguage("empty", false);
        }
      }
    }

    function postMessage(text: string) {
      langWorker.postMessage([sourceOrTarget, text]);
    }
  }

  let supportedSourceLanguage = false;
  function updateSourceLanguage(lang: string, supported: boolean) {
    domSourceLang.textContent = lang;
    supportedSourceLanguage = supported;
    submitButton.disabled =
      !(supportedSourceLanguage && supportedTargetLanguage);
    if (supportedSourceLanguage) {
      domSourceLang.classList.remove("unsupported");
    } else {
      domSourceLang.classList.add("unsupported");
    }
  }

  let supportedTargetLanguage = false;
  function updateTargetLanguage(lang: string, supported: boolean) {
    domTargetLang.textContent = lang;
    supportedTargetLanguage = supported;
    submitButton.disabled =
      !(supportedSourceLanguage && supportedTargetLanguage);
    if (supportedTargetLanguage) {
      domTargetLang.classList.remove("unsupported");
    } else {
      domTargetLang.classList.add("unsupported");
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
