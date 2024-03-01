import * as HunalignLib from "@bitextual/hunalign";
import { Hunalign } from "./hunalign.js";
import { LanguageName } from "./language.js";
import { render } from "./render.js";

export type AlignmentConfig = {
	sourceLang: LanguageName;
	targetLang: LanguageName;
	hunalignLib: HunalignLib.Hunalign;
	hunalignDictData: Uint8Array;
};

export async function align(
	sourceText: string,
	targetText: string,
	conf: AlignmentConfig,
): Promise<string> {
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

export function paragraphs(plaintext: string): string[] {
	return plaintext.trim().split("\n");
}
