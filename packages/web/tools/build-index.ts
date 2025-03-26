import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";
import { simpleGit } from "simple-git";
import pkg from "../package.json" with { type: "json" };

const __filename = new URL(import.meta.url).pathname;
const __dirname = dirname(__filename);
const packageRoot = dirname(__dirname);

async function buildIndex() {
	const buildScriptP = buildScript();
	const git = simpleGit();
	const commitHash = await git.revparse(["HEAD"]);
	const status = await git.status();
	const hasUncommittedChanges = !status.isClean();

	const VERSION_PLACEHOLDER = "__VERSION__";
	const VERSION_TAG = `${pkg.name}@${pkg.version}+${commitHash}.${
		hasUncommittedChanges ? "dirty" : "clean"
	}`;

	const indexPath = resolve(packageRoot, "src/index.html");
	const indexOut = resolve(packageRoot, "dist/index.html");
	let outContent = await readFile(indexPath, "utf-8");
	outContent = outContent.replace(VERSION_PLACEHOLDER, VERSION_TAG);

	const builtScript = await buildScriptP;
	const scriptTag = `<script>${builtScript}</script>`;
	outContent = outContent.replace("</body>", `${scriptTag}</body>`);

	return writeFile(indexOut, outContent);
}

async function buildScript() {
	const entryPoint = resolve(packageRoot, "src/main.ts");
	const outdir = resolve(packageRoot, "dist");
	const res = await build({
		entryPoints: [entryPoint],
		bundle: true,
		minify: true,
		sourcemap: true,
		format: "esm",
		write: false,
		target: "esnext",
		outdir,
	});

	let mainContent = "";
	for (const outputFile of res.outputFiles) {
		if (outputFile.path.endsWith(".map")) {
			await writeFile(outputFile.path, outputFile.text);
			continue;
		}
		mainContent = outputFile.text;
	}
	return mainContent;
}

await buildIndex();
