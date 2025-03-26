import { submitEventSchema } from "@bitextual/web-events/events.js";

export { onRequestPost };

interface Env {
	EVENTS?: AnalyticsEngineDataset;
}

const REQUEST_BODY_SIZE_LIMIT_BYTES = 1024; // seems high enough

const onRequestPost: PagesFunction<Env> = async (context) => {
	const request = context.request;

	const { headers } = request;
	if (headers.get("content-type") !== "application/json") {
		return new Response("Bad Request: application/json content-type required", {
			status: 400,
		});
	}

	const contentLengthStr = headers.get("content-length");
	if (contentLengthStr === null) {
		return new Response("Bad Request: content-length header required", {
			status: 400,
		});
	}
	const contentLength = Number.parseInt(contentLengthStr, 10);
	if (Number.isNaN(contentLength)) {
		return new Response("Bad Request: content-length header must be a number", {
			status: 400,
		});
	}
	if (contentLength > REQUEST_BODY_SIZE_LIMIT_BYTES) {
		return new Response("Payload Too Large", { status: 413 });
	}

	const country = request.cf?.country ?? "unknown";
	const region = request.cf?.region ?? "unknown";
	const city = request.cf?.city ?? "unknown";

	const json = await request.json();
	const event = await submitEventSchema.parseAsync(json);

	const HEX_RADIX = 16;
	const blobs = [
		event.clientId,
		event.sourceFile,
		event.sourceLang,
		event.sourceSize.toString(10),
		event.sourceCrc.toString(HEX_RADIX),
		event.targetFile,
		event.targetLang,
		event.targetSize.toString(10),
		event.targetCrc.toString(HEX_RADIX),
		country,
		region,
		city,
		event.format,
	];
	const dp = { indexes: [], blobs, doubles: [] };
	if (context.env.EVENTS === undefined) {
		console.error("EVENTS is not defined");
	} else {
		context.env.EVENTS.writeDataPoint(dp);
	}
	return new Response();
};
