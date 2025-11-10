import type { Http } from './core/request'
import { create } from './core/request'
import type { HttpOptions, Method, RequestOptions, Result } from './core/models'
import { callable, error, parse } from './core/helpers'
import { HttpDefaultOptions } from './core/options'

export const server = (options?: HttpOptions) => {
  const http = create({
    base: '',
    timeout: HttpDefaultOptions.Timeout,
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

const execute = async <Data>(
  http: Http,
  method: Method,
  source: string | (() => Promise<Response>),
  body?: unknown,
  parameters?: RequestOptions<Data>,
): Promise<Result<Data>> => {
  if (callable(source)) {
    try {
      const response = await source()

      return await parse<Data>(response, parameters?.verify)
    } catch (thrown) {
      return error(thrown)
    }
  }

  if (method === 'GET') {
    return http.get<Data>(source, parameters)
  }

  if (method === 'POST') {
    return http.post<Data>(source, body, parameters)
  }

  if (method === 'PUT') {
    return http.put<Data>(source, body, parameters)
  }

  if (method === 'PATCH') {
    return http.patch<Data>(source, body, parameters)
  }

  return http.delete<Data>(source, parameters)
}

const getter = (http: Http) => {
  function get<Data>(action: () => Promise<Response>): Promise<Result<Data>>

  function get<Data>(endpoint: string, parameters?: RequestOptions<Data>): Promise<Result<Data>>

  function get<Data>(
    source: string | (() => Promise<Response>),
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return execute(http, 'GET', source, undefined, parameters)
  }

  return get
}

const poster = (http: Http) => {
  function post<Data>(action: () => Promise<Response>): Promise<Result<Data>>

  function post<Data>(
    endpoint: string,
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>>

  function post<Data>(
    source: string | (() => Promise<Response>),
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return execute(http, 'POST', source, body, parameters)
  }

  return post
}

const updater = (http: Http) => {
  function put<Data>(action: () => Promise<Response>): Promise<Result<Data>>

  function put<Data>(
    endpoint: string,
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>>

  function put<Data>(
    source: string | (() => Promise<Response>),
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return execute(http, 'PUT', source, body, parameters)
  }

  return put
}

const remover = (http: Http) => {
  function remove<Data>(action: () => Promise<Response>): Promise<Result<Data>>

  function remove<Data>(endpoint: string, parameters?: RequestOptions<Data>): Promise<Result<Data>>

  function remove<Data>(
    source: string | (() => Promise<Response>),
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return execute(http, 'DELETE', source, undefined, parameters)
  }

  return remove
}

const patcher = (http: Http) => {
  function patch<Data>(action: () => Promise<Response>): Promise<Result<Data>>

  function patch<Data>(
    endpoint: string,
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>>

  function patch<Data>(
    source: string | (() => Promise<Response>),
    body?: unknown,
    parameters?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return execute(http, 'PATCH', source, body, parameters)
  }

  return patch
}
