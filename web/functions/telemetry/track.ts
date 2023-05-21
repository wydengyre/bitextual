const MIXPANEL_API_ROOT = "https://api-js.mixpanel.com/track/";
export const onRequestPost: PagesFunction = ({ request }) => {
  const parsedURL = new URL(request.url);
  const proxiedURL = MIXPANEL_API_ROOT + parsedURL.search;
  console.log("mixpanel proxying", proxiedURL);

  const headers = request.headers;
  const clientIP = headers.get("CF-Connecting-IP");
  if (clientIP) {
    headers.set("X-Real-IP", clientIP);

    const xForwardedFor = headers.get("X-Forwarded-For");
    if (xForwardedFor) {
      headers.set("X-Forwarded-For", xForwardedFor + ", " + clientIP);
    } else {
      headers.set("X-Forwarded-For", clientIP);
    }

    headers.set("X-Forwarded-Host", parsedURL.host);
  }

  // add proxying headers
  return fetch(proxiedURL, {
    method: "POST",
    headers,
    body: request.body,
  });
};
