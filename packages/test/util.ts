import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export { fixturePath, readFixtureString };

function fixturePath(fixtureName: string): string {
	return fileURLToPath(import.meta.resolve(`./${fixtureName}`));
}

function readFixtureString(fixtureName: string): Promise<string> {
	const path = fixturePath(fixtureName);
	return readFile(path, "utf-8");
}
