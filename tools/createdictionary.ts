import * as xml from "xml";
import { z } from "zod";
import { basename, fromFileUrl, join } from "std/path/mod.ts";

// written because apertium-dixtools explodes on my machine

const apertiumSchema = z.object({
  dictionary: z.object({
    section: z.object({
      e: z.object({
        p: z.object({
          l: z.string().or(z.object({}).passthrough()),
          r: z.string().or(z.object({}).passthrough()),
        }),
      }).array(),
    }),
  }),
});

async function main() {
  const args = Deno.args;
  const resourcesPath = fromFileUrl(import.meta.resolve("../resources"));

  if (args.length !== 1) {
    console.error("USAGE: provide apertium .dix dictionary path as argument");
    Deno.exit(1);
  }

  const inPath = args[0];
  const infileName = basename(inPath);

  const _EXPECTED_FORMAT = "apertium-lang1-lang2.lang1-lang2.dix";
  const [lang1, lang2] = infileName.split(".")[1].split("-");

  const outFilename1 = `${lang1}-${lang2}.dic`;
  const outFilename2 = `${lang2}-${lang1}.dic`;

  const outPath1 = join(resourcesPath, outFilename1);
  const outPath2 = join(resourcesPath, outFilename2);

  await go(inPath, outPath1, outPath2);
}

async function go(inPath: string, outPath1: string, outPath2: string) {
  const inStr = await Deno.readTextFile(inPath);
  const [out1, out2] = await process(inStr);
  await Promise.all([
    Deno.writeTextFile(outPath1, out1),
    Deno.writeTextFile(outPath2, out2),
  ]);
}

function process(dict: string): [string, string] {
  const dictXml = xml.parse(dict);
  const parsed = apertiumSchema.parse(dictXml);
  const es = parsed.dictionary.section.e;
  const defs: [string | object, string | object][] = es.map((
    { p: { l, r } },
  ) => [l, r]);
  const stringDefs: [string, string][] = defs.filter((
    def,
  ): def is [string, string] =>
    typeof def[0] === "string" && typeof def[1] === "string"
  );
  console.log(stringDefs);
  return ["foo", "bar"];
}

if (import.meta.main) {
  await main();
}
