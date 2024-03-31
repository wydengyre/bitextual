import { submitEventSchema } from "@bitextual/web-events/events.js";

export { onRequest };

interface Env {
	EVENTS?: AnalyticsEngineDataset;
}

const REQUEST_BODY_SIZE_LIMIT_BYTES = 1024; // seems high enough

const onRequest: PagesFunction<Env> = async (context) => {
	const request = context.request;

	if (request.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}
	const { headers } = request;
	if (headers.get("content-type") !== "application/json") {
		return new Response("Bad Request", { status: 400 });
	}
	if (headers.get("content-length") > REQUEST_BODY_SIZE_LIMIT_BYTES) {
		return new Response("Payload Too Large", { status: 413 });
	}

	const country = request.cf?.country ?? "unknown";
	const region = request.cf?.region ?? "unknown";
	const city = request.cf?.city ?? "unknown";

	const json = await request.json();
	console.log("received event", json);
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
	console.log("registering event", dp);
	if (context.env.EVENTS === undefined) {
		console.error("EVENTS is not defined");
	} else {
		context.env.EVENTS.writeDataPoint(dp);
	}
	return new Response();
};
