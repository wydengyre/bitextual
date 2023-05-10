import { readAll } from "std/streams/read_all.ts";

const BITEXTOR_SEPARATOR = "\t";
const HUNALIGN_SEPARATOR = " @ ";

async function main() {
  const out = await go(Deno.stdin);
  console.log(out);
}

async function go(r: Deno.Reader): Promise<string> {
  const slurped = await readAll(r);
  const text = new TextDecoder().decode(slurped);
  const replaced = text.replaceAll(BITEXTOR_SEPARATOR, HUNALIGN_SEPARATOR);

  // alpha sort
  return replaced.split("\n")
    .sort()
    .join("\n");
}

if (import.meta.main) {
  await main();
}
