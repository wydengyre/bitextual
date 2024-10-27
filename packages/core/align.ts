import { Hunalign } from "./hunalign.js";
import { render } from "./render.js";

export type { AlignmentConfig };
export { alignParas, alignTexts, paragraphs };

type AlignmentConfig = {
	sourceLang: string;
	targetLang: string;
	hunalignDictData: Uint8Array;
	meta?: Map<string, string>;
};

async function alignTexts(
	title: string,
	sourceText: string,
	targetText: string,
	conf: AlignmentConfig,
): Promise<string> {
	// consider each line of text a paragraph
	const sourceParagraphs: string[] = paragraphs(sourceText);
	const targetParagraphs: string[] = paragraphs(targetText);

	const paras = await alignParas(sourceParagraphs, targetParagraphs, conf);
	return render(title, conf.sourceLang, conf.targetLang, paras, conf.meta);
}

async function alignParas(
	sourceParas: string[],
	targetParas: string[],
	conf: AlignmentConfig,
): Promise<[string[], string[]][]> {
	const hunalign = await Hunalign.create();
	return hunalign.align(conf.hunalignDictData, sourceParas, targetParas);
}

function paragraphs(plaintext: string): string[] {
	return plaintext
		.trim()
		.split("\n")
		.filter((p) => p.trim().length > 0);
}
