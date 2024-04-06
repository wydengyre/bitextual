const { CF_ACCOUNT_ID, CF_ANALYTICS_READ_KEY } = process.env;
if (!CF_ACCOUNT_ID) {
	throw new Error("CF_ACCOUNT_ID env var is required");
}
if (!CF_ANALYTICS_READ_KEY) {
	throw new Error("CF_EVENTS_READ_API_KEY env var is required");
}

const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql`;
const body = "SELECT * FROM EVENTS;";
const res = await fetch(url, {
	method: "POST",
	headers: {
		Authorization: `Bearer ${CF_ANALYTICS_READ_KEY}`,
	},
	body,
});

if (!res.ok) {
	throw new Error(`Failed to fetch events: ${res.status} ${await res.text()}`);
}
const { data } = await res.json();

if (!Array.isArray(data)) {
	throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}
const events = data
	.toSorted(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	)
	.map((event: object) => Object.values(event).filter((d) => d));
console.log(events);
