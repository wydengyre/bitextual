import { type Remote, wrap } from "comlink";
import type { Worker } from "./worker.js";

const w = new Worker("worker.js", { type: "module" });
const worker: Remote<Worker> = wrap(w);

const sourceFileId = "sourceText";
const targetFileId = "targetText";
const epubButtonId = "epub";
const submitButtonId = "submit";

type Model =
	| {
			sourceFile: null;
			targetFile: null;
			error: Error | null;
			loading: false;
	  }
	| {
			sourceFile: File;
			targetFile: File;
			error: null;
			loading: boolean;
	  };
const model: Model = {
	sourceFile: null,
	targetFile: null,
	error: null,
	loading: false,
};

const clientId = crypto.randomUUID();

let loaded = false;
let errDiv: HTMLDivElement;
let epubButton: HTMLButtonElement;
let submitButton: HTMLButtonElement;
let version = "unknown";
function loadDom() {
	if (loaded) {
		return;
	}
	loaded = true;
	document.removeEventListener("DOMContentLoaded", loadDom);

	const getElementById = <T extends HTMLElement>(
		id: string,
		elementType: new () => T,
	): T => {
		const res = document.getElementById(id);
		if (res === null) {
			throw new Error(`loadDom: id ${id} not found`);
		}
		if (!(res instanceof elementType)) {
			throw new Error(`loadDom: id ${id} is not an ${elementType}`);
		}
		return res;
	};

	version =
		document.head
			.querySelector("meta[name='version']")
			?.getAttribute("content") ?? "unknown";

	const sourceFileInput = getElementById(sourceFileId, HTMLInputElement);
	const targetFileInput = getElementById(targetFileId, HTMLInputElement);
	errDiv = getElementById("error", HTMLDivElement);
	epubButton = getElementById(epubButtonId, HTMLButtonElement);
	submitButton = getElementById(submitButtonId, HTMLButtonElement);

	sourceFileInput.addEventListener("change", onSourceFileChange);
	targetFileInput.addEventListener("change", onTargetFileChange);
	epubButton.addEventListener("click", onSubmit);
	submitButton.addEventListener("click", onSubmit);

	updateUI();
}

async function onSourceFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file === undefined) {
		return;
	}
	model.sourceFile = file;
	updateUI();
}

async function onTargetFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file === undefined) {
		return;
	}
	model.targetFile = file;
	updateUI();
}

async function onSubmit(event: Event) {
	event.preventDefault();

	const { target } = event;

	if (model.sourceFile === null || model.targetFile === null) {
		throw new Error("onSubmit: model.sourceFile or model.targetFile is null");
	}

	model.loading = true;
	updateUI();

	// submit the two files, with version info
	const meta = [
		["clientId", clientId],
		["version", version],
	] as const;

	if (target !== epubButton) {
		const rendered = await worker.renderAlignment(
			model.sourceFile,
			model.targetFile,
			meta,
		);

		const blob = new Blob([rendered], { type: "text/html" });
		window.location.href = URL.createObjectURL(blob);
		return;
	}

	const rendered = await worker.renderEpub(
		model.sourceFile,
		model.targetFile,
		meta,
	);
	const blob = new Blob([rendered], { type: "application/epub+zip" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	document.body.appendChild(a);
	a.style.display = "none";
	a.href = url;
	a.download = `${model.sourceFile.name}.aligned.epub`;
	a.click();
	URL.revokeObjectURL(url);

	model.loading = false;
	updateUI();
}

function updateUI() {
	const { sourceFile, targetFile, loading } = model;
	const derivedState = {
		error: model.error?.message ?? "",
		submissionEnabled: sourceFile !== null && targetFile !== null && !loading,
		submitButtonText: loading ? "Loading" : "View HTML",
	};

	errDiv.innerText = derivedState.error;
	epubButton.disabled = !derivedState.submissionEnabled;
	submitButton.disabled = !derivedState.submissionEnabled;
	submitButton.textContent = derivedState.submitButtonText;
}

window.onerror = (message, source, lineno, colno, error) => {
	console.error("window.onerror", message, source, lineno, colno, error);
	if (error === undefined) {
		return;
	}
	model.loading = false;
	model.error = error;
	updateUI();

	// purposely fire-and-forget
	const body = JSON.stringify([
		clientId,
		version,
		message,
		source,
		lineno,
		colno,
		error,
	]);
	fetch("/error", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", loadDom);
} else {
	loadDom();
}
