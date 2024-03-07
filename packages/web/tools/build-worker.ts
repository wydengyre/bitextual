import path from "node:path";
import * as esbuild from "esbuild";
import { simpleGit } from "simple-git";
import { name as packageName, version } from "../package.json" with {
	type: "json",
};

const git = simpleGit();

async function build() {
	try {
		const commitHash = await git.revparse(["HEAD"]);
		const status = await git.status();
		const hasUncommittedChanges = !status.isClean();

		const VERSION_TAG = `${packageName}@${version}+${commitHash}.${
			hasUncommittedChanges ? "dirty" : "clean"
		}`;

		const __filename = new URL(import.meta.url).pathname;
		const __dirname = path.dirname(__filename);
		const workerPath = path.join(__dirname, "../src/worker.ts");
		await esbuild.build({
			entryPoints: [workerPath],
			bundle: true,
			minify: true,
			sourcemap: true,
			outfile: "./dist/worker.js",
			define: { VERSION_TAG: JSON.stringify(VERSION_TAG) },
			external: ["module"], // needed to handle emscripten nodejs support
		});

		console.log("Build completed successfully");
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}

await build();
