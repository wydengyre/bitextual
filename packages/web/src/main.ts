import { type Remote, wrap } from "comlink";
import type { RenderAlignmentFn } from "./worker.js";

const worker = new Worker("worker.js", { type: "module" });
const renderAlignment: Remote<RenderAlignmentFn> = wrap(worker);

const sourceFileId = "sourceText";
const targetFileId = "targetText";
const submitButtonId = "submit";
const formId = "form";

type Model =
	| {
			sourceFile: null;
			targetFile: null;
			loading: false;
	  }
	| {
			sourceFile: File;
			targetFile: File;
			loading: true;
	  };
const model = new Proxy<Model>(
	{
		sourceFile: null,
		targetFile: null,
		loading: false,
	},
	{
		set: (target: Model, prop: keyof Model, value): boolean => {
			target[prop] = value;
			updateUI();
			return true;
		},
	},
);

let loaded = false;
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
	const form = getElementById(formId, HTMLFormElement);
	submitButton = getElementById(submitButtonId, HTMLButtonElement);

	sourceFileInput.addEventListener("change", onSourceFileChange);
	targetFileInput.addEventListener("change", onTargetFileChange);
	form.addEventListener("submit", onSubmit);

	updateUI();
}

async function onSourceFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file === undefined) {
		return;
	}
	model.sourceFile = file;
}

async function onTargetFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file === undefined) {
		return;
	}
	model.targetFile = file;
}

async function onSubmit(event: Event) {
	event.preventDefault();

	if (model.sourceFile === null || model.targetFile === null) {
		// TODO: surface this to the user
		console.error("onSubmit: model.sourceFile or model.targetFile is null");
		return;
	}
	// submit the two files, with version info
	const meta = [["version", version]] as const;

	let rendered = "";
	try {
		rendered = await renderAlignment(model.sourceFile, model.targetFile, meta);
	} catch (e) {
		// TODO: surface this to the user
		console.error("onSubmit: renderAlignment failed", e);
		return;
	}

	const blob = new Blob([rendered], { type: "text/html" });
	window.location.href = URL.createObjectURL(blob);
}

function updateUI() {
	const { sourceFile, targetFile, loading } = model;
	const derivedState = {
		submissionEnabled: sourceFile !== null && targetFile !== null,
		submitButtonText: loading ? "Loading" : "Submit",
	};

	submitButton.disabled = !derivedState.submissionEnabled;
	submitButton.textContent = derivedState.submitButtonText;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", loadDom);
} else {
	loadDom();
}
