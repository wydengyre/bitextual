export const onRequestPost: PagesFunction = async ({ request }) => {
  // We tee the stream so we can pull the header out of one stream
  // and pass the other straight as the fetch POST body
  const header = request.clone();

  const decoder = new TextDecoder();
  let chunk = "";

  const headerReader = header.body.getReader();

  while (true) {
    const { done, value } = await headerReader.read();

    if (done) {
      break;
    }

    chunk += decoder.decode(value);

    const index = chunk.indexOf("\n");

    if (index >= 0) {
      const firstLine = chunk.slice(0, index);
      const event = JSON.parse(firstLine);
      const dsn = new URL(event.dsn);

      console.log("Posting to Sentry", event);
      return fetch(`https://${dsn.host}/api${dsn.pathname}/envelope/`, {
        method: "POST",
        body: request.body,
      });
    }
  }
};
