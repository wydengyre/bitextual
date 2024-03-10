import { defaultKeymap } from "@codemirror/commands";
import type { Text } from "@codemirror/state";
import {
	EditorView,
	type ViewUpdate,
	keymap,
	lineNumbers,
	placeholder,
} from "@codemirror/view";
// TODO: Sentry
// import * as Sentry from "@sentry/browser";
import { debounce } from "lodash-es";

// TODO: what was this for?
// const BITEXTUAL_RELEASE = "__BITEXTUAL_RELEASE__";

// TODO
// Sentry.init({
// 	dsn: "https://2f79996e488047e2bb0d918f701bf82e@o4505204684750848.ingest.sentry.io/4505204686520320",
// 	release: BITEXTUAL_RELEASE,
// 	tunnel: "/sentry/",
// });

const WORKER_PATH = "worker.js";
const EPUB_WORKER_PATH = "epub-worker.js";
const LANG_WORKER_PATH = "lang-worker.js";
// TODO: make this some kind of optional/modular thing
// const MIXPANEL_WORKER_PATH = "mixpanel-worker.js";

const INITIAL_SOURCE_TEXT = `Paste your source text here, with each paragraph a single line.
You can also use the epub import button, above.`;

const INITIAL_TARGET_TEXT = `Paste your target text here, with each paragraph on a single line.
You can also use the epub import button, above.`;

const worker = new Worker(WORKER_PATH, { type: "module" });
const epubWorker = new Worker(EPUB_WORKER_PATH, { type: "module" });
const langWorker = new Worker(LANG_WORKER_PATH, { type: "module" });
// const mixpanelWorker = new Worker(MIXPANEL_WORKER_PATH);

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

// TODO: mixpanel
// mixpanelWorker.postMessage(["view", {}]);

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
	const querySelector = <T extends Element = Element>(selector: string) => {
		const res = document.querySelector<T>(selector);
		if (res === null) {
			throw new Error(`loadDom: selector ${selector} not found`);
		}
		return res;
	};
	const getElementById = (id: string) => {
		const res = document.getElementById(id);
		if (res === null) {
			throw new Error(`loadDom: id ${id} not found`);
		}
		return res;
	};

	const version =
		document.head
			.querySelector("meta[name='version']")
			?.getAttribute("content") ?? "unknown";
	console.log(`VERSION: ${version}`);

	const introModal = querySelector<HTMLDialogElement>(INTRO_MODAL_SELECTOR);
	const introContinueButton = querySelector<HTMLButtonElement>(
		INTRO_CONTINUE_BUTTON_SELECTOR,
	);

	const buttons = [
		IMPORT_EPUB_SOURCE_SELECTOR,
		IMPORT_EPUB_TARGET_SELECTOR,
		ALIGN_SELECTOR,
	].map((selector) => querySelector<HTMLButtonElement>(selector)) as [
		HTMLButtonElement,
		HTMLButtonElement,
		HTMLButtonElement,
	];
	const [sourceEpubButton, targetEpubButton, submitButton] = buttons;

	const domSourceLang = getElementById(SOURCE_LANG_ID);
	const domTargetLang = getElementById(TARGET_LANG_ID);

	const sourcePanel = getElementById(SOURCE_PANEL_ID);
	const targetPanel = getElementById(TARGET_PANEL_ID);

	const errorMessage = getElementById(ERROR_MESSAGE_ID);

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
		source: string | null;
		target: string | null;
	} = {
		source: null,
		target: null,
	};
	langWorker.onmessage = (e: MessageEvent<["source" | "target", string]>) => {
		const [sourceOrTarget, lang] = e.data;
		langs[sourceOrTarget] = lang;

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
		domSourceLang.textContent = langs.source || "";
		updateSubmitButton();
	}

	function updateTargetLanguage() {
		domTargetLang.textContent = langs.target || "";
		updateSubmitButton();
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

		// TODO: mixpanel
		// mixpanelWorker.postMessage(["submit", {
		//   source: sourceText.slice(0, 100),
		//   target: targetText.slice(0, 100),
		// }]);

		if (langs.source === null) {
			throw new Error("submit: langs.source is null");
		}
		if (langs.target === null) {
			throw new Error("submit: langs.target is null");
		}

		const meta = [["version", version]];
		worker.postMessage([
			langs.source,
			langs.target,
			sourceText,
			targetText,
			meta,
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
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) {
			return;
		}
		const arrayBuffer = await file.arrayBuffer();
		// TODO: mixpanel
		// mixpanelWorker.postMessage(["imported", {
		//   sourceOrTarget,
		//   name: file.name,
		// }]);
		epubWorker.postMessage([sourceOrTarget, arrayBuffer]);
	});
	input.click();
}
