import * as _nuxt_schema from '@nuxt/schema';
import { Readable } from 'node:stream';
import { FetchOptions } from 'ofetch';
import { OpenAPITSOptions, OpenAPI3 } from 'openapi-typescript';

type OpenAPI3Schema = string | URL | OpenAPI3 | Readable;
interface OpenFetchOptions extends Pick<FetchOptions, 'baseURL' | 'query' | 'headers'> {
}
interface OpenFetchClientOptions extends OpenFetchOptions {
    schema?: OpenAPI3Schema;
}
interface ModuleOptions {
    clients?: Record<string, OpenFetchClientOptions>;
    openAPITS?: OpenAPITSOptions;
    disablePlugin?: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions>;

export { type ModuleOptions, type OpenFetchClientOptions, type OpenFetchOptions, _default as default };
