import { existsSync } from 'node:fs';
import { defineNuxtModule, createResolver, addTypeTemplate, addImportsSources, addTemplate, addPlugin } from '@nuxt/kit';
import openapiTS from 'openapi-typescript';
import { kebabCase, pascalCase } from 'scule';
import { defu } from 'defu';

const isValidUrl = (url) => {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
};

const moduleName = "nuxt-open-fetch";
const module = defineNuxtModule({
  meta: {
    name: moduleName,
    configKey: "openFetch",
    compatibility: {
      nuxt: "^3.0.0"
    }
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    const schemas = [];
    const clients = defu(nuxt.options.runtimeConfig.openFetch, options.clients);
    nuxt.options.runtimeConfig.public.openFetch = Object.fromEntries(Object.entries(clients).map(([key, { schema: _, ...options2 }]) => [key, options2]));
    for (const layer of nuxt.options._layers) {
      const { srcDir, openFetch } = layer.config;
      const schemasDir = resolve(srcDir, "openapi");
      const layerClients = defu(
        Object.fromEntries(Object.entries(clients).filter(([key]) => openFetch?.clients?.[key])),
        openFetch?.clients
      );
      for (const [name, config] of Object.entries(layerClients)) {
        if (schemas.some((item) => item.name === name) || !config)
          continue;
        let schema = void 0;
        if (config.schema && typeof config.schema === "string") {
          schema = isValidUrl(config.schema) ? config.schema : resolve(srcDir, config.schema);
        } else {
          const jsonPath = resolve(schemasDir, `${name}/openapi.json`);
          const yamlPath = resolve(schemasDir, `${name}/openapi.yaml`);
          schema = existsSync(jsonPath) ? jsonPath : existsSync(yamlPath) ? yamlPath : void 0;
        }
        if (!schema)
          throw new Error(`Could not find OpenAPI schema for "${name}"`);
        schemas.push({
          name,
          fetchName: {
            composable: getClientName(name),
            lazyComposable: getClientName(name, true)
          },
          schema,
          openAPITS: options?.openAPITS
        });
      }
    }
    nuxt.options.optimization = nuxt.options.optimization || {
      keyedComposables: []
    };
    nuxt.options.optimization.keyedComposables = [
      ...nuxt.options.optimization.keyedComposables,
      ...schemas.flatMap(({ fetchName }) => [
        { name: fetchName.composable, argumentLength: 3 },
        { name: fetchName.lazyComposable, argumentLength: 3 }
      ])
    ];
    for (const { name, schema, openAPITS } of schemas) {
      addTypeTemplate({
        filename: `types/${moduleName}/${kebabCase(name)}.d.ts`,
        getContents: () => openapiTS(schema, openAPITS)
      });
    }
    addImportsSources({
      from: resolve(nuxt.options.buildDir, `${moduleName}.ts`),
      imports: schemas.flatMap(({ fetchName }) => Object.values(fetchName))
    });
    addImportsSources({
      from: resolve(`runtime/clients`),
      imports: [
        "createOpenFetch",
        "createUseOpenFetch",
        "openFetchRequestInterceptor",
        "OpenFetchClient",
        "UseOpenFetchClient",
        "OpenFetchOptions"
      ]
    });
    addTemplate({
      filename: `${moduleName}.ts`,
      getContents() {
        return `
import { createUseOpenFetch } from '#imports'
${schemas.map(({ name }) => `
import type { paths as ${pascalCase(name)}Paths } from '#build/types/${moduleName}/${kebabCase(name)}'
export type ${pascalCase(name)}Paths
`.trimStart()).join("").trimEnd()}

${schemas.length ? `export type OpenFetchClientName = ${schemas.map(({ name }) => `'${name}'`).join(" | ")}` : ""}

${schemas.map(({ name, fetchName }) => `
export const ${fetchName.composable} = createUseOpenFetch<${pascalCase(name)}Paths, false>('${name}')
export const ${fetchName.lazyComposable} = createUseOpenFetch<${pascalCase(name)}Paths, true>('${name}', true)
`.trimStart()).join("\n")}`.trimStart();
      },
      write: true
    });
    addTypeTemplate({
      filename: `types/${moduleName}.d.ts`,
      getContents: () => `
import type { OpenFetchClient } from '#imports'
${schemas.map(({ name }) => `
import type { paths as ${pascalCase(name)}Paths } from '#build/types/${moduleName}/${kebabCase(name)}'
`.trimStart()).join("").trimEnd()}

declare module '#app' {
  interface NuxtApp {
    ${schemas.map(({ name }) => `
    $${name}Fetch: OpenFetchClient<${pascalCase(name)}Paths>`.trimStart()).join("\n")}
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    ${schemas.map(({ name }) => `
    $${name}Fetch: OpenFetchClient<${pascalCase(name)}Paths>`.trimStart()).join("\n")}
  }
}

export {}
`.trimStart()
    });
    if (!options.disablePlugin)
      addPlugin(resolve("./runtime/plugin"));
  }
});
function getClientName(name, lazy = false) {
  return `use${lazy ? "Lazy" : ""}${pascalCase(`${name}-fetch`)}`;
}

export { module as default };
