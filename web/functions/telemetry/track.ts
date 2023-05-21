const MIXPANEL_API_ROOT = "https://api-js.mixpanel.com/track/";
export const onRequestPost: PagesFunction = ({ request }) => {
  const parsedURL = new URL(request.url);
  const proxiedURL = MIXPANEL_API_ROOT + parsedURL.search;
  console.log("mixpanel proxying", proxiedURL);

  // add proxying headers
  return fetch(proxiedURL, {
    method: "POST",
    body: request.body,
  });
};
