import { readAll } from "std/streams/read_all.ts";

const HUNALIGN_SEPARATOR = " @ ";

async function main() {
  const out = await go(Deno.stdin);
  console.log(out);
}

async function go(r: Deno.Reader): Promise<string> {
  const slurped = await readAll(r);
  const text = new TextDecoder().decode(slurped);

  // alpha sort
  return text.split("\n")
    .map((line) => {
      const [source, target] = line.split(HUNALIGN_SEPARATOR);
      return target + HUNALIGN_SEPARATOR + source;
    })
    .sort()
    .join("\n");
}

if (import.meta.main) {
  await main();
}
