import { z } from "zod";

export type { SubmitEvent };
export { submitEventSchema };

type SubmitEvent = z.infer<typeof submitEventSchema>;
const submitEventSchema = z.object({
	clientId: z.string(),
	sourceFile: z.string(),
	sourceLang: z.string(),
	sourceSize: z.number(),
	sourceCrc: z.number(),
	targetFile: z.string(),
	targetLang: z.string(),
	targetSize: z.number(),
	targetCrc: z.number(),
});
