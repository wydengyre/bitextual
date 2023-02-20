import { DenoHunalign } from "../resources/hunalign/deno/hunalign.js";
import { fromFileUrl } from "std/path/mod.ts";

export const PARAGRAPH_MARKER = "<p>";
const WASM_BINARY_PATH = fromFileUrl(
  import.meta.resolve("../resources/hunalign/deno/hunalign.wasm"),
);

async function main() {
  // TODO: bring this back
  // const aligned = await hunalign();
  // console.log(aligned);
}

export async function align(
  sourceSplitParagraphs: string[][],
  targetSplitParagraphs: string[][],
  dictPath: string,
): Promise<[string[], string[]][]> {
  const dictContent = await Deno.readFile(dictPath);
  const sourceText = textifySplitParagraphs(sourceSplitParagraphs);
  const targetText = textifySplitParagraphs(targetSplitParagraphs);

  const hunalign = await DenoHunalign.createWithWasmPath(WASM_BINARY_PATH);
  const ladder = hunalign.run(dictContent, sourceText, targetText);

  const sourceLines = sourceText.split("\n");
  const targetLines = targetText.split("\n");
  const matches: [string[], string[]][] = [];
  for (let i = 0, l = 0, r = 0; i < ladder.length; i++) {
    const [lPrime, rPrime] = ladder[i];

    const leftLines: string[] = [];
    for (; l <= lPrime; l++) {
      leftLines.push(sourceLines[l]);
    }

    const rightLines: string[] = [];
    for (; r <= rPrime; r++) {
      rightLines.push(targetLines[r]);
    }

    matches.push([leftLines, rightLines]);
  }
  return matches;
}

function textifySplitParagraphs(split: string[][]): string {
  return split
    .map((splitParagraph) => splitParagraph.join("\n"))
    .join(`\n${PARAGRAPH_MARKER}\n`);
}

if (import.meta.main) {
  await main();
}
