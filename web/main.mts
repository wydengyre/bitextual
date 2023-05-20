import { minimalSetup } from "codemirror";
import type { Text } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  placeholder,
  ViewUpdate,
} from "@codemirror/view";
import { debounce } from "lodash-es";
import mixpanel from "mixpanel-browser";
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn:
    "https://2f79996e488047e2bb0d918f701bf82e@o4505204684750848.ingest.sentry.io/4505204686520320",
  release: "dev",
});

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

epubWorker.onerror = (e: ErrorEvent) => {
  console.error(e);
  throw new Error(`epub worker error ${e.message}`);
};

langWorker.onerror = (e: ErrorEvent) => {
  throw new Error(`lang worker error ${e.message}`);
};

const IMPORT_EPUB_SOURCE_SELECTOR = "#import-epub-source";
const IMPORT_EPUB_TARGET_SELECTOR = "#import-epub-target";
const ALIGN_SELECTOR = "#align";

const SOURCE_LANG_ID = "source-detected-language";
const TARGET_LANG_ID = "target-detected-language";

const ERROR_MESSAGE_ID = "error-message";

const SOURCE_PANEL_ID = "panel-source";
const TARGET_PANEL_ID = "panel-target";

const MIXPANEL_TOKEN = "95dfbbd102f147a2dc289937aa7109ab";
mixpanel.init(MIXPANEL_TOKEN);
mixpanel.set_config({ "persistence": "localStorage" });
// @ts-ignore: outdated types
mixpanel.track_pageview();

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

  const errorMessage = document.getElementById(ERROR_MESSAGE_ID)!;

  const editorSource = mkEditorView("source", INITIAL_SOURCE_TEXT, sourcePanel);
  const editorTarget = mkEditorView("target", INITIAL_TARGET_TEXT, targetPanel);

  sourceEpubButton.addEventListener("click", importEpubSource);
  targetEpubButton.addEventListener("click", importEpubTarget);
  submitButton.addEventListener("click", submit);

  worker.onerror = (e: ErrorEvent) => {
    console.error(e);
    submitButton.classList.remove("loading");
    updateSubmitButton();
    updateError(`Error generating alignment. ${e.message}`);
    throw new Error(e.message);
  };

  epubWorker.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
    const [sourceOrTarget, text] = e.data;
    const editor = sourceOrTarget === "source" ? editorSource : editorTarget;
    const { state } = editor;
    const update = state.update({
      changes: { from: 0, to: state.doc.length, insert: text },
    });
    editor.update([update]);
  };

  let langs: {
    source: [boolean, string] | null;
    target: [boolean, string] | null;
  } = {
    source: null,
    target: null,
  };
  langWorker.onmessage = (
    e: MessageEvent<
      ["source" | "target", string | ["unsupported", string]]
    >,
  ) => {
    const [sourceOrTarget, lang] = e.data;

    let trackingLang = lang;
    if (Array.isArray(lang)) {
      langs[sourceOrTarget] = [false, lang[1]];
      trackingLang = lang[1];
      console.debug(`unsupported ${sourceOrTarget} language`, lang[1]);
    } else {
      langs[sourceOrTarget] = [true, lang];
    }
    mixpanel.track("language-detected", { language: trackingLang }, {
      send_immediately: true,
    });

    if (sourceOrTarget === "source") {
      updateSourceLanguage();
    } else {
      updateTargetLanguage();
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
        minimalSetup,
        lineNumbers(),
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
          langs.source = null;
          updateSourceLanguage();
        } else {
          langs.target = null;
          updateTargetLanguage();
        }
      }
    }

    function postMessage(text: string) {
      langWorker.postMessage([sourceOrTarget, text]);
    }
  }

  function updateError(err: string | null) {
    if (err === null) {
      errorMessage.textContent = "";
      errorMessage.classList.add("hidden");
    } else {
      errorMessage.textContent = err;
      errorMessage.classList.remove("hidden");
    }
  }

  function updateSourceLanguage() {
    domSourceLang.textContent = langs.source?.[1] || "";
    updateSubmitButton();
    if (langs.source?.[0]) {
      domSourceLang.classList.remove("unsupported");
    } else {
      domSourceLang.classList.add("unsupported");
    }
  }

  function updateTargetLanguage() {
    domTargetLang.textContent = langs.target?.[1] || "";
    updateSubmitButton();
    if (langs.target?.[0]) {
      domTargetLang.classList.remove("unsupported");
    } else {
      domTargetLang.classList.add("unsupported");
    }
  }

  function updateSubmitButton() {
    submitButton.disabled = !(langs.source?.[0] && langs.target?.[0]);
  }

  function submit(this: HTMLButtonElement, e: Event) {
    e.preventDefault();

    this.classList.add("loading");
    this.disabled = true;

    const sourceText = editorSource.state.doc.toString();
    const targetText = editorTarget.state.doc.toString();

    mixpanel.track("submit", {
      source: sourceText.slice(0, 100),
      target: targetText.slice(0, 100),
    }, {
      send_immediately: true,
    });

    worker.postMessage([
      langs.source![1],
      langs.target![1],
      sourceText,
      targetText,
    ]);
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
    mixpanel.track("Imported", { sourceOrTarget, name: file.name }, {
      send_immediately: true,
    });
    epubWorker.postMessage([sourceOrTarget, bytes]);
  });
  input.click();
}
