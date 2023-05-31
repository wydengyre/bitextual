import mixpanel from "mixpanel-browser";

// note that this only works because we're using a custom build of mixpanel-browser
// that replaces XHR with fetch
// see https://github.com/mixpanel/mixpanel-js/issues/304

const MIXPANEL_TOKEN = "95dfbbd102f147a2dc289937aa7109ab";

mixpanel.init(MIXPANEL_TOKEN);
mixpanel.set_config({ api_host: "/telemetry" });
// @ts-ignore: outdated types
mixpanel.track_pageview();

self.onmessage = (e: MessageEvent<[string, Record<string, string>]>) => {
  const [event, props] = e.data;
  mixpanel.track(event, props, { send_immediately: true });
};
