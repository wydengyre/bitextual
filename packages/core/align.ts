import * as HunalignLib from "@bitextual/hunalign";
import { Hunalign } from "./hunalign.js";
import { render } from "./render.js";

export type { AlignmentConfig };
export { align, paragraphs };

type AlignmentConfig = {
	sourceLang: string;
	targetLang: string;
	hunalignLib: HunalignLib.Hunalign;
	hunalignDictData: Uint8Array;
};

function align(
	sourceText: string,
	targetText: string,
	conf: AlignmentConfig,
): string {
	// consider each line of text a paragraph
	const sourceParagraphs: string[] = paragraphs(sourceText);
	const targetParagraphs: string[] = paragraphs(targetText);

	const hunalign = Hunalign.create(conf.hunalignLib);
	const aligned: [string[], string[]][] = hunalign.align(
		conf.hunalignDictData,
		sourceParagraphs,
		targetParagraphs,
	);

	return render(conf.sourceLang, conf.targetLang, aligned);
}

function paragraphs(plaintext: string): string[] {
	return plaintext.trim().split("\n");
}
