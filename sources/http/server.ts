import { unify } from './core/helpers'
import type {
  Endpoint,
  ExtendedBase,
  HttpOptions,
  Method,
  Outcome,
  RequestOptions,
} from './core/models'
import { create } from './core/request'
import type { Http } from './core/request'

export type GetSource<Base extends string, Data = unknown> =
  | Endpoint<Base>
  | (() => Promise<Outcome<Data>>)

export type GetOptions<Data> = RequestOptions<Data>

export type Get<Base extends string, Data> = (
  source: GetSource<Base, Data>,
  options?: GetOptions<Data>,
) => Promise<Outcome<Data>>

export type PostSource<Base extends string, Data = unknown, Body = unknown> =
  | Endpoint<Base>
  | ((body?: Body) => Promise<Outcome<Data>>)

export type PostOptions<Data> = RequestOptions<Data>

export type Post<Base extends string, Data, Body = unknown> = (
  source: PostSource<Base, Data, Body>,
  body?: Body,
  options?: PostOptions<Data>,
) => Promise<Outcome<Data>>

export type PutSource<Base extends string, Data = unknown, Body = unknown> =
  | Endpoint<Base>
  | ((body?: Body) => Promise<Outcome<Data>>)

export type PutOptions<Data> = RequestOptions<Data>

export type Put<Base extends string, Data, Body = unknown> = (
  source: PutSource<Base, Data, Body>,
  body?: Body,
  options?: PutOptions<Data>,
) => Promise<Outcome<Data>>

export type DeleteSource<Base extends string, Data = unknown> =
  | Endpoint<Base>
  | (() => Promise<Outcome<Data>>)

export type DeleteOptions<Data> = RequestOptions<Data>

export type Delete<Base extends string, Data> = (
  source: DeleteSource<Base, Data>,
  options?: DeleteOptions<Data>,
) => Promise<Outcome<Data>>

export type PatchSource<Base extends string, Data = unknown, Body = unknown> =
  | Endpoint<Base>
  | ((body?: Body) => Promise<Outcome<Data>>)

export type PatchOptions<Data> = RequestOptions<Data>

export type Patch<Base extends string, Data, Body = unknown> = (
  source: PatchSource<Base, Data, Body>,
  body?: Body,
  options?: PatchOptions<Data>,
) => Promise<Outcome<Data>>

type Methods<Base extends string> = {
  get: {
    <Data>(action: () => Promise<Outcome<Data>>, options?: GetOptions<Data>): Promise<Outcome<Data>>
    <Data>(endpoint: Endpoint<Base>, options?: GetOptions<Data>): Promise<Outcome<Data>>
  }
  post: {
    <Data, Body = unknown>(
      action: (body?: Body) => Promise<Outcome<Data>>,
      body?: Body,
      options?: PostOptions<Data>,
    ): Promise<Outcome<Data>>
    <Data, Body = unknown>(
      endpoint: Endpoint<Base>,
      body?: Body,
      options?: PostOptions<Data>,
    ): Promise<Outcome<Data>>
  }
  put: {
    <Data, Body = unknown>(
      action: (body?: Body) => Promise<Outcome<Data>>,
      body?: Body,
      options?: PutOptions<Data>,
    ): Promise<Outcome<Data>>
    <Data, Body = unknown>(
      endpoint: Endpoint<Base>,
      body?: Body,
      options?: PutOptions<Data>,
    ): Promise<Outcome<Data>>
  }
  delete: {
    <Data>(
      action: () => Promise<Outcome<Data>>,
      options?: DeleteOptions<Data>,
    ): Promise<Outcome<Data>>
    <Data>(endpoint: Endpoint<Base>, options?: DeleteOptions<Data>): Promise<Outcome<Data>>
  }
  patch: {
    <Data, Body = unknown>(
      action: (body?: Body) => Promise<Outcome<Data>>,
      body?: Body,
      options?: PatchOptions<Data>,
    ): Promise<Outcome<Data>>
    <Data, Body = unknown>(
      endpoint: Endpoint<Base>,
      body?: Body,
      options?: PatchOptions<Data>,
    ): Promise<Outcome<Data>>
  }
}

export type Builder<Base extends string> = Methods<Base> & {
  extend: <const Extended extends Partial<HttpOptions>>(
    extended: Extended,
  ) => Builder<ExtendedBase<Base, Extended>>
}

const builder = <Base extends string>(http: Http<Base>): Builder<Base> => ({
  get: getter(http),
  post: poster(http),
  put: updater(http),
  delete: remover(http),
  patch: patcher(http),
  extend: <const Extended extends Partial<HttpOptions>>(extended: Extended) =>
    builder(http.extend(extended)),
})

export const server = <const Options extends Partial<HttpOptions>>(options?: Options) =>
  builder(create(options))

const execute = async <Base extends string, Data, Body = unknown>(
  http: Http<Base>,
  method: Method,
  source:
    | GetSource<Base, Data>
    | PostSource<Base, Data, Body>
    | PutSource<Base, Data, Body>
    | DeleteSource<Base, Data>
    | PatchSource<Base, Data, Body>,
  body?: Body,
  options?:
    | GetOptions<Data>
    | PostOptions<Data>
    | PutOptions<Data>
    | DeleteOptions<Data>
    | PatchOptions<Data>,
): Promise<Outcome<Data>> => {
  const handlers: Record<Method, (endpoint: Endpoint<Base>) => Promise<Outcome<Data>>> = {
    GET: (endpoint) => http.get<Data>(endpoint, options),
    POST: (endpoint) => http.post<Data>(endpoint, body, options),
    PUT: (endpoint) => http.put<Data>(endpoint, body, options),
    PATCH: (endpoint) => http.patch<Data>(endpoint, body, options),
    DELETE: (endpoint) => http.delete<Data>(endpoint, options),
  }

  return unify<Data, [Body?]>({
    source,
    parameters: [body],
    executor: handlers[method],
    verify: options?.verify,
  })
}

const getter = <Base extends string>(http: Http<Base>) => {
  function get<Data>(
    action: () => Promise<Outcome<Data>>,
    options?: GetOptions<Data>,
  ): Promise<Outcome<Data>>

  function get<Data>(endpoint: Endpoint<Base>, options?: GetOptions<Data>): Promise<Outcome<Data>>

  function get<Data>(
    source: GetSource<Base, Data>,
    options?: GetOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'GET', source, undefined, options)
  }

  return get
}

const poster = <Base extends string>(http: Http<Base>) => {
  function post<Data, Body = unknown>(
    action: (body?: Body) => Promise<Outcome<Data>>,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>>

  function post<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>>

  function post<Data, Body = unknown>(
    source: PostSource<Base, Data, Body>,
    body?: Body,
    options?: PostOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'POST', source, body, options)
  }

  return post
}

const updater = <Base extends string>(http: Http<Base>) => {
  function put<Data, Body = unknown>(
    action: (body?: Body) => Promise<Outcome<Data>>,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>>

  function put<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>>

  function put<Data, Body = unknown>(
    source: PutSource<Base, Data, Body>,
    body?: Body,
    options?: PutOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'PUT', source, body, options)
  }

  return put
}

const remover = <Base extends string>(http: Http<Base>) => {
  function remove<Data>(
    action: () => Promise<Outcome<Data>>,
    options?: DeleteOptions<Data>,
  ): Promise<Outcome<Data>>

  function remove<Data>(
    endpoint: Endpoint<Base>,
    options?: DeleteOptions<Data>,
  ): Promise<Outcome<Data>>

  function remove<Data>(
    source: DeleteSource<Base, Data>,
    options?: DeleteOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'DELETE', source, undefined, options)
  }

  return remove
}

const patcher = <Base extends string>(http: Http<Base>) => {
  function patch<Data, Body = unknown>(
    action: (body?: Body) => Promise<Outcome<Data>>,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>>

  function patch<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>>

  function patch<Data, Body = unknown>(
    source: PatchSource<Base, Data, Body>,
    body?: Body,
    options?: PatchOptions<Data>,
  ): Promise<Outcome<Data>> {
    return execute(http, 'PATCH', source, body, options)
  }

  return patch
}
