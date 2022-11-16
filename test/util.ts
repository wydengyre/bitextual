import { fromFileUrl } from "std/path/mod.ts";

export function readFixture(fixtureName: string): Promise<Uint8Array> {
  const fixturePath = fromFileUrl(import.meta.resolve(`./${fixtureName}`));
  return Deno.readFile(fixturePath);
}

export function readFixtureString(fixtureName: string): Promise<string> {
  const fixturePath = fromFileUrl(import.meta.resolve(`./${fixtureName}`));
  return Deno.readTextFile(fixturePath);
}
