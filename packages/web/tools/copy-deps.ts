import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copySync, emptyDirSync } from "fs-extra/esm";

const HUNALIGN_PATH = realpathSync(
	dirname(fileURLToPath(import.meta.resolve("@bitextual/hunalign/"))),
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const targetPath = `${dirname(__dirname)}/dist`;
const hunalignTarget = `${targetPath}/hunalign`;

emptyDirSync(hunalignTarget);
copySync(HUNALIGN_PATH, hunalignTarget);
