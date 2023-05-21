const SLUG = "/sentry/";

export const onRequestPost: PagesFunction = async (context) => {
  const request = context.request;
  const url = new URL(request.url);

  if (url.pathname === SLUG) {
    const { readable, writable } = new TransformStream();
    request.body.pipeTo(writable);

    // We tee the stream so we can pull the header out of one stream
    // and pass the other straight as the fetch POST body
    const [header, body] = readable.tee();

    const decoder = new TextDecoder();
    let chunk = "";

    const headerReader = header.getReader();

    while (true) {
      const { done, value } = await headerReader.read();

      if (done) {
        break;
      }

      chunk += decoder.decode(value);

      const index = chunk.indexOf("\n");

      if (index >= 0) {
        // Get the first line
        const firstLine = chunk.slice(0, index);
        const event = JSON.parse(firstLine);
        const dsn = new URL(event.dsn);
        // Post to the Sentry endpoint!
        console.log("Posting to Sentry", event);
        return fetch(`https://${dsn.host}/api${dsn.pathname}/envelope/`, {
          method: "POST",
          body,
        });
      }
    }
  }

  // If the above routes don't match, return 404
  return new Response(null, { status: 404 });
};
