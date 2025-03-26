import { type Remote, wrap } from "comlink";
import type { Worker } from "./worker.js";

const w = new Worker("worker.js", { type: "module" });
const worker: Remote<Worker> = wrap(w);

const sourceFileId = "sourceText";
const targetFileId = "targetText";
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
	submitButton = getElementById(submitButtonId, HTMLButtonElement);

	sourceFileInput.addEventListener("change", onSourceFileChange);
	targetFileInput.addEventListener("change", onTargetFileChange);
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

	const rendered = await worker.renderAlignment(
		model.sourceFile,
		model.targetFile,
		meta,
	);

	const blob = new Blob([rendered], { type: "text/html" });
	window.location.href = URL.createObjectURL(blob);
}

window.onerror = (message, source, lineno, colno, error) => {
	let outErr = error;
	if (outErr === undefined) {
		const outMessage = message.toString();
		outErr = new Error(outMessage);
	}
	handleError(
		outErr,
		"window.onerror",
		String(message),
		String(source),
		lineno ?? null,
		colno ?? null,
		String(error),
	);
};

window.onunhandledrejection = (event) => {
	const reason = String(event.reason);
	const err = new Error(reason);
	handleError(err, "window.onunhandledrejection", reason);
};

// Improved model error handling
function handleError(
	error: Error,
	type: string,
	...details: (string | number | null)[]
) {
	model.loading = false;
	model.error = error;
	updateUI();

	console.error(type, ...details);

	// Prepare body for sending
	const body = JSON.stringify([type, clientId, version, ...details]);

	if (navigator.sendBeacon) {
		navigator.sendBeacon("/error", body);
	} else {
		fetch("/error", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
		}).then(() => {}); // fire-and-forget
	}
}

function updateUI() {
	const { sourceFile, targetFile, loading } = model;
	const derivedState = {
		error: model.error?.message ?? "",
		submissionEnabled: sourceFile !== null && targetFile !== null && !loading,
		submitButtonText: loading ? "Loading" : "View HTML",
	};

	errDiv.innerText = derivedState.error;
	submitButton.disabled = !derivedState.submissionEnabled;
	submitButton.textContent = derivedState.submitButtonText;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", loadDom);
} else {
	loadDom();
}
