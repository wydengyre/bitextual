import type { Text } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder,
  ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { capitalize, debounce } from "lodash-es";
import * as Sentry from "@sentry/browser";
import { language, LanguageName } from "../lib/language.js";
import { supportedLanguages } from "../build/supported-languages.js";

const BITEXTUAL_RELEASE = "__BITEXTUAL_RELEASE__";

Sentry.init({
  dsn:
    "https://2f79996e488047e2bb0d918f701bf82e@o4505204684750848.ingest.sentry.io/4505204686520320",
  release: BITEXTUAL_RELEASE,
  tunnel: "/sentry/",
});

const WORKER_PATH = "worker.js";
const EPUB_WORKER_PATH = "epub-worker.js";
const LANG_WORKER_PATH = "lang-worker.js";
const MIXPANEL_WORKER_PATH = "mixpanel-worker.js";

const INITIAL_SOURCE_TEXT =
  `Paste your source text here, with each paragraph a single line.
You can also use the epub import button, above.`;

const INITIAL_TARGET_TEXT =
  `Paste your target text here, with each paragraph on a single line.
You can also use the epub import button, above.`;

const worker = new Worker(WORKER_PATH);
const epubWorker = new Worker(EPUB_WORKER_PATH);
const langWorker = new Worker(LANG_WORKER_PATH);
const mixpanelWorker = new Worker(MIXPANEL_WORKER_PATH);

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

mixpanelWorker.postMessage(["view", {}]);

const INTRO_MODAL_SELECTOR = "#intro-modal";
const INTRO_CONTINUE_BUTTON_SELECTOR = "#continue-btn";

const IMPORT_EPUB_SOURCE_SELECTOR = "#import-epub-source";
const IMPORT_EPUB_TARGET_SELECTOR = "#import-epub-target";
const ALIGN_SELECTOR = "#align";

const SOURCE_LANG_ID = "source-detected-language";
const TARGET_LANG_ID = "target-detected-language";

const ERROR_MESSAGE_ID = "error-message";

const SOURCE_PANEL_ID = "panel-source";
const TARGET_PANEL_ID = "panel-target";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDom);
} else {
  loadDom();
}

function loadDom() {
  const introModal = document.querySelector<HTMLDialogElement>(
    INTRO_MODAL_SELECTOR,
  )!;
  const introContinueButton = document.querySelector<HTMLButtonElement>(
    INTRO_CONTINUE_BUTTON_SELECTOR,
  )!;

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

  const langs: {
    source: [boolean, string] | null;
    target: [boolean, string] | null;
    supportedPair: boolean;
  } = {
    source: null,
    target: null,
    supportedPair: false,
  };
  langWorker.onmessage = (
    e: MessageEvent<
      ["source" | "target", string | ["unsupported", string]]
    >,
  ) => {
    const [sourceOrTarget, lang] = e.data;

    let trackingLang = lang;
    if (Array.isArray(lang)) {
      if (langs[sourceOrTarget]?.[1] === lang[1]) {
        // no change
        return;
      }
      langs[sourceOrTarget] = [false, lang[1]];
      trackingLang = lang[1];
      console.debug(`unsupported ${sourceOrTarget} language`, lang[1]);
    } else {
      if (langs[sourceOrTarget]?.[1] === lang) {
        return;
      }
      langs[sourceOrTarget] = [true, lang];
    }

    let err: string | null = null;
    if (langs.source?.[0] === false) {
      err = `Unsupported source language: ${langs.source[1]}`;
    } else if (langs.target?.[0] === false) {
      err = `Unsupported target language: ${langs.target[1]}`;
    } else if (langs.source !== null && langs.target !== null) {
      const sourceLangName = langs.source[1];
      const targetLangName = langs.target[1];
      const sourceLangCode = language[sourceLangName as LanguageName];
      const targetLangCode = language[targetLangName as LanguageName];

      // TODO: put in a worker and test in isolation
      langs.supportedPair = supportedLanguages
        .filter(([source, target]: [string, string]) =>
          source === sourceLangCode && target === targetLangCode
        )
        .length > 0;
      if (!langs.supportedPair) {
        const supportedTargets: string = supportedLanguages
          .filter(([source]: [string, string]) => sourceLangCode === source)
          .map(([, target]: [string, string]) => target)
          .join(", ");
        err = `Unsupported language pair: ${capitalize(sourceLangName)} -> ${
          capitalize(targetLangName)
        }
        Supported target languages for ${
          capitalize(sourceLangName)
        }: ${supportedTargets}`;
      }
    }
    updateError(err);

    mixpanelWorker.postMessage(["language-detected", {
      language: trackingLang,
    }]);

    if (sourceOrTarget === "source") {
      updateSourceLanguage();
    } else {
      updateTargetLanguage();
    }
  };

  sourceEpubButton.disabled = false;
  targetEpubButton.disabled = false;

  introContinueButton.addEventListener("click", () => {
    introModal.close(); // Close the modal when the button is clicked
  });
  introModal.showModal();

  function mkEditorView(
    sourceOrTarget: "source" | "target",
    initialText: string,
    parent: HTMLElement,
  ): EditorView {
    return new EditorView({
      extensions: [
        lineNumbers(),
        EditorView.lineWrapping,
        placeholder(initialText),
        keymap.of(defaultKeymap),
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
        if (sourceOrTarget === "source" && langs.source !== null) {
          langs.source = null;
          updateSourceLanguage();
        } else if (langs.target !== null) {
          langs.target = null;
          updateTargetLanguage();
        }
      }
    }

    function postMessage(text: string) {
      langWorker.postMessage([sourceOrTarget, text]);
    }
  }

  function updateError(err: string | null = null) {
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
    submitButton.disabled =
      !(langs.source?.[0] && langs.target?.[0] && langs.supportedPair);
  }

  function submit(this: HTMLButtonElement, e: Event) {
    e.preventDefault();

    this.classList.add("loading");
    this.disabled = true;

    const sourceText = editorSource.state.doc.toString();
    const targetText = editorTarget.state.doc.toString();

    mixpanelWorker.postMessage(["submit", {
      source: sourceText.slice(0, 100),
      target: targetText.slice(0, 100),
    }]);

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
    mixpanelWorker.postMessage(["imported", {
      sourceOrTarget,
      name: file.name,
    }]);
    epubWorker.postMessage([sourceOrTarget, bytes]);
  });
  input.click();
}
