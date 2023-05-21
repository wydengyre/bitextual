const DSN =
  "https://2f79996e488047e2bb0d918f701bf82e@o4505204684750848.ingest.sentry.io/4505204686520320";
const DSN_URL = new URL(DSN);
const FETCH_URL = `https://${DSN_URL.host}/api${DSN_URL.pathname}/envelope/`;

// generally, the first line of the request body is around 200 bytes long
// if we don't run into a newline within 1000 bytes, something is definitely wrong
const HEADER_LENGTH_LIMIT_BYTE = 1_000;

// 2 MB max body
const MAX_CONTENT_SIZE = 2_000_000;

// see https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
export const onRequestPost: PagesFunction = async ({ request }) => {
  const contentLength = parseInt(request.headers.get("content-length"));
  if (contentLength > MAX_CONTENT_SIZE) {
    console.log("got too large payload", contentLength);
    return new Response("Payload too large", { status: 413 });
  }

  console.log("headers", JSON.stringify([...request.headers.entries()]));
  // We tee the stream so we can pull the header out of one stream
  // and pass the other straight as the fetch POST body
  const header = request.clone();

  const decoder = new TextDecoder();
  let chunk = "";

  const headerReader = header.body.getReader();

  let readLength = 0;
  while (true) {
    if (readLength > HEADER_LENGTH_LIMIT_BYTE) {
      break;
    }
    const { done, value } = await headerReader.read();

    if (done) {
      break;
    }

    chunk += decoder.decode(value);
    readLength += value.length;

    const index = chunk.indexOf("\n");

    if (index >= 0) {
      const firstLine = chunk.slice(0, index);
      const event = JSON.parse(firstLine);

      if (event.dsn !== DSN) {
        console.log("DSN mismatch", event.dsn);
        return new Response("DSN mismatch", { status: 400 });
      }

      console.log("Posting to Sentry", event);
      return fetch(FETCH_URL, {
        method: "POST",
        body: request.body,
      });
    }
  }

  return new Response("No newline found in header", { status: 400 });
};
