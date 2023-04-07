import { emit } from "emit";
import { fromFileUrl } from "std/path/mod.ts";

const entrypoint = fromFileUrl(import.meta.resolve("./align.ts"));

async function main() {
  console.log(`entrypoint: ${entrypoint}`);
  const result = await emit(entrypoint);
  console.log(result);
  // console.log(result.code);
}

if (import.meta.main) {
  await main();
}
