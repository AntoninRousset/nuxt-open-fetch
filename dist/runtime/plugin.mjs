import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { createOpenFetch } from "#imports";
export default defineNuxtPlugin(() => {
  const clients = useRuntimeConfig().public.openFetch;
  return {
    provide: Object.entries(clients).reduce((acc, [name, client]) => ({
      ...acc,
      [`${name}Fetch`]: createOpenFetch(client)
    }), {})
  };
});
