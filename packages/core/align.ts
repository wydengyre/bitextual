import { Hunalign } from "./hunalign.js";
import { render } from "./render.js";

export type { AlignmentConfig };
export { align, paragraphs };

type AlignmentConfig = {
	sourceLang: string;
	targetLang: string;
	hunalignDictData: Uint8Array;
	meta?: Map<string, string>;
};

async function align(
	sourceText: string,
	targetText: string,
	conf: AlignmentConfig,
): Promise<string> {
	// consider each line of text a paragraph
	const sourceParagraphs: string[] = paragraphs(sourceText);
	const targetParagraphs: string[] = paragraphs(targetText);

	const hunalign = await Hunalign.create();
	const aligned: [string[], string[]][] = hunalign.align(
		conf.hunalignDictData,
		sourceParagraphs,
		targetParagraphs,
	);

	return render(conf.sourceLang, conf.targetLang, aligned, conf.meta);
}

function paragraphs(plaintext: string): string[] {
	return plaintext.trim().split("\n");
}
