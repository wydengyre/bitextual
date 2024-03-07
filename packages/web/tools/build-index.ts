import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import { name as packageName, version } from "../package.json" with {
	type: "json",
};

async function build() {
	const git = simpleGit();
	const commitHash = await git.revparse(["HEAD"]);
	const status = await git.status();
	const hasUncommittedChanges = !status.isClean();

	const VERSION_PLACEHOLDER = "__VERSION__";
	const VERSION_TAG = `${packageName}@${version}+${commitHash}.${
		hasUncommittedChanges ? "dirty" : "clean"
	}`;

	const __filename = new URL(import.meta.url).pathname;
	const __dirname = path.dirname(__filename);
	const indexPath = path.resolve(__dirname, "../src/index.html");
	const indexOut = path.resolve(__dirname, "../dist/index.html");
	const indexContent = await readFile(indexPath, "utf-8");
	const outContent = indexContent.replace(VERSION_PLACEHOLDER, VERSION_TAG);
	return writeFile(indexOut, outContent);
}

await build();
