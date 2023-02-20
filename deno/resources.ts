import { fromFileUrl } from "std/path/mod.ts";

export const resourcePath = (rel: string) =>
  fromFileUrl(import.meta.resolve(`../resources/${rel}`));
