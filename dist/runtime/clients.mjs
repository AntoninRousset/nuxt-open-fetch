import { $fetch } from "ofetch";
import { toValue, useNuxtApp, useFetch } from "#imports";
export function createOpenFetch(options) {
  return (url, opts) => $fetch(
    fillPath(url, opts.path),
    typeof options === "function" ? options(opts) : {
      ...options,
      ...opts
    }
  );
}
export function createUseOpenFetch(client, lazy) {
  return (url, options = {}, autoKey) => {
    const nuxtApp = useNuxtApp();
    const $fetch2 = typeof client === "string" ? nuxtApp[`$${client}Fetch`] : client;
    const opts = { $fetch: $fetch2, key: autoKey, ...options };
    return useFetch(() => toValue(url), lazy ? { ...opts, lazy } : opts);
  };
}
export function fillPath(path, params = {}) {
  for (const [k, v] of Object.entries(params))
    path = path.replace(`{${k}}`, encodeURIComponent(String(v)));
  return path;
}
