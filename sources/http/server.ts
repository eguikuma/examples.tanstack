import { failify, isFunction, outcomify } from './core/helpers'
import type { HttpOptions, Method, Outcome, RequestOptions } from './core/models'
import { HttpDefaultOptions } from './core/options'
import { create } from './core/request'
import type { Http } from './core/request'

export type GetSource = string | (() => Promise<Response>)

export type GetOptions<Data> = RequestOptions<Data>

export type Get<Data> = (source: GetSource, options?: GetOptions<Data>) => Promise<Outcome<Data>>

export type PostSource<Body = unknown> = string | ((body?: Body) => Promise<Response>)

export type PostOptions<Data> = RequestOptions<Data>

export type Post<Data, Body = unknown> = (
  source: PostSource<Body>,
  body?: Body,
  options?: PostOptions<Data>,
) => Promise<Outcome<Data>>

export type PutSource<Body = unknown> = string | ((body?: Body) => Promise<Response>)

export type PutOptions<Data> = RequestOptions<Data>

export type Put<Data, Body = unknown> = (
  source: PutSource<Body>,
  body?: Body,
  options?: PutOptions<Data>,
) => Promise<Outcome<Data>>

export type DeleteSource = string | (() => Promise<Response>)

export type DeleteOptions<Data> = RequestOptions<Data>

export type Delete<Data> = (
  source: DeleteSource,
  options?: DeleteOptions<Data>,
) => Promise<Outcome<Data>>

export type PatchSource<Body = unknown> = string | ((body?: Body) => Promise<Response>)

export type PatchOptions<Data> = RequestOptions<Data>

export type Patch<Data, Body = unknown> = (
  source: PatchSource<Body>,
  body?: Body,
  options?: PatchOptions<Data>,
) => Promise<Outcome<Data>>

export const server = (options?: HttpOptions) => {
  const http = create({
    ...HttpDefaultOptions,
    ...options,
  })

  return {
    get: getter(http),
    post: poster(http),
    put: updater(http),
    delete: remover(http),
    patch: patcher(http),
  }
}

const execute = async <Data, Body = unknown>(
  http: Http,
  method: Method,
  source: GetSource | PostSource<Body> | PutSource<Body> | DeleteSource | PatchSource<Body>,
  body?: Body,
  options?:
    | GetOptions<Data>
    | PostOptions<Data>
    | PutOptions<Data>
    | DeleteOptions<Data>
    | PatchOptions<Data>,
): Promise<Outcome<Data>> => {
  if (isFunction(source)) {
    try {
      const response = await source(body)

      return await outcomify<Data>(response, options?.verify)
    } catch (thrown) {
      return await failify(thrown)
    }
  }

  if (method === 'GET') {
    return http.get<Data>(source, options)
  }

  if (method === 'POST') {
    return http.post<Data>(source, body, options)
  }

  if (method === 'PUT') {
    return http.put<Data>(source, body, options)
  }

  if (method === 'PATCH') {
    return http.patch<Data>(source, body, options)
  }

  return http.delete<Data>(source, options)
}

const getter = (http: Http) => {
  function get<Data>(
    action: () => Promise<Response>,
    options?: GetOptions<Data>,
  ): Promise<Outcome<Data>>

  function get<Data>(endpoint: string, options?: GetOptions<Data>): Promise<Outcome<Data>>

  function get<Data>(source: GetSource, options?: GetOptions<Data>): Promise<Outcome<Data>> {
    return execute(http, 'GET', source, undefined, options)
  }

  return get
}

const poster = (http: Http) => {
  function post<Data, Body = unknown>(
    action: (body?: Body) => Promise<Response>,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>>

  function post<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>>

  function post<Data, Body = unknown>(
    source: PostSource<Body>,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'POST', source, body, options)
  }

  return post
}

const updater = (http: Http) => {
  function put<Data, Body = unknown>(
    action: (body?: Body) => Promise<Response>,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>>

  function put<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>>

  function put<Data, Body = unknown>(
    source: PutSource<Body>,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'PUT', source, body, options)
  }

  return put
}

const remover = (http: Http) => {
  function remove<Data>(
    action: () => Promise<Response>,
    options?: DeleteOptions<Data>,
  ): Promise<Outcome<Data>>

  function remove<Data>(endpoint: string, options?: DeleteOptions<Data>): Promise<Outcome<Data>>

  function remove<Data>(
    source: DeleteSource,
    options?: DeleteOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'DELETE', source, undefined, options)
  }

  return remove
}

const patcher = (http: Http) => {
  function patch<Data, Body = unknown>(
    action: (body?: Body) => Promise<Response>,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>>

  function patch<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>>

  function patch<Data, Body = unknown>(
    source: PatchSource<Body>,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'PATCH', source, body, options)
  }

  return patch
}
