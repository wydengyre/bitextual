import { fromFileUrl } from "std/path/mod.ts";

export function readFixtureString(fixtureName: string): Promise<string> {
  const fixturePath = fromFileUrl(import.meta.resolve(`./${fixtureName}`));
  return Deno.readTextFile(fixturePath);
}
