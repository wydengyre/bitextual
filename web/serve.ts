// Copyright (C) 2023 Wyden and Gyre, LLC
import { serve as httpServe, ServeInit } from "std/http/server.ts";
import { serveDir } from "std/http/file_server.ts";
import { configPath, configVal } from "./build-conf.ts";

// Development server. Not for production use.
const distDir = configPath("distDir");

function main(): Promise<void> {
  const port = Number.parseInt(configVal("devPort"));
  return serve({ port });
}

export async function serve(options: ServeInit = {}) {
  const handler = (req: Request): Promise<Response> => {
    return serveDir(req, { fsRoot: distDir });
  };
  httpServe(handler, options);
}

if (import.meta.main) {
  await main();
}
