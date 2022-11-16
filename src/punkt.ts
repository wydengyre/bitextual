// TODO: WASM

import { writeAll } from "std/streams/conversion.ts";
import { resourcePath } from "./resources.ts";

const PUNKT_BIN_PATH = resourcePath("punkt");

export type Language = "en" | "es" | "fr";

export async function sentences(
  language: Language,
  text: string,
): Promise<string[]> {
  const process = Deno.run({
    cmd: [PUNKT_BIN_PATH, language],
    stdin: "piped",
    stdout: "piped",
  });

  const textBytes = new TextEncoder().encode(text);
  if (!process.stdin) {
    throw "process stdin undefined: this should be impossible";
  }
  await writeAll(process.stdin, textBytes);
  process.stdin.close();

  const out = await process.output();
  const { success, code } = await process.status();
  if (!success) {
    throw `failed with code ${code}`;
  }
  process.close();

  const outText = new TextDecoder().decode(out);

  // for now we trim whitespace here...
  // in theory we could (should?) do this in Rust
  return outText.split("\n")
    .map((line) => line.trim());
}
