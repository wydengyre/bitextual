export { onRequest };

interface Env {
	ERRORS?: AnalyticsEngineDataset;
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
	console.log("received error", json);

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
