import { go } from "../deno/main.ts";
import { fromFileUrl } from "std/path/mod.ts";

const BOVARY_FRENCH_PATH = fromFileUrl(
  import.meta.resolve("./bovary.french.edited.txt"),
);
const BOVARY_ENGLISH_PATH = fromFileUrl(
  import.meta.resolve("./bovary.english.edited.txt"),
);
const BOVARY_ALIGNED_PATH = fromFileUrl(
  import.meta.resolve("./bovary.aligned.html"),
);

const MARIANELA_SPANISH_PATH = fromFileUrl(
  import.meta.resolve("./marianela.spanish.edited.txt"),
);
const MARIANELA_ENGLISH_PATH = fromFileUrl(
  import.meta.resolve("./marianela.english.edited.txt"),
);
const MARIANELA_ALIGNED_PATH = fromFileUrl(
  import.meta.resolve("./marianela.aligned.html"),
);

async function main() {
  const bovary = await go([
    BOVARY_FRENCH_PATH,
    BOVARY_ENGLISH_PATH,
  ]);
  const marianela = await go([
    MARIANELA_SPANISH_PATH,
    MARIANELA_ENGLISH_PATH,
  ]);
  await Promise.all([
    Deno.writeTextFile(BOVARY_ALIGNED_PATH, bovary),
    Deno.writeTextFile(MARIANELA_ALIGNED_PATH, marianela),
  ]);
}

if (import.meta.main) {
  await main();
}
