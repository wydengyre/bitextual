export { onRequestPost };

interface Env {
	ERRORS?: AnalyticsEngineDataset;
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
	console.log("received error", json);
	if (!Array.isArray(json)) {
		return new Response("Bad Request: JSON must be an array", { status: 400 });
	}

	const blobs = [
		...json.map((d: object) => d.toString()),
		country,
		region,
		city,
	];
	const dp = { indexes: [], blobs, doubles: [] };
	console.log("registering error", dp);
	if (context.env.ERRORS === undefined) {
		console.error("ERRORS is not defined");
	} else {
		context.env.ERRORS.writeDataPoint(dp);
	}
	return new Response();
};
