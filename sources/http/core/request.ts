import { StatusCodes } from 'http-status-codes'

import { InvalidUrlError, UrlTooLongError, VerifyError } from './errors'
import { assertMetadata, assertUrl, chain, failify, outcomify } from './helpers'
import type {
  DefaultBase,
  HttpOptions,
  Method,
  RequestOptions,
  RequestContext,
  ResponseContext,
  Outcome,
  OnInterceptor,
  Join,
  Endpoint,
} from './models'

const defaults: HttpOptions = {
  base: '',
  timeout: 10000,
  credentials: 'same-origin',
}

export class Http<Base extends string = string> {
  private readonly _options: HttpOptions

  constructor(options: HttpOptions = {}) {
    this._options = {
      ...defaults,
      ...options,
    }
  }

  async request<Data>(
    method: Method,
    endpoint: Endpoint<Base>,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    try {
      let before: RequestContext<Data> = {
        method,
        endpoint: this.endpoint(endpoint, options),
        options: {
          ...options,
          headers: {
            ...this._options.headers,
            ...options?.headers,
          },
          credentials: options?.credentials ?? this._options.credentials,
          timeout: options?.timeout ?? this._options.timeout,
          localhost: options?.localhost !== undefined ? options.localhost : this._options.localhost,
        },
        body,
      }

      for (const interceptor of this._options.interceptors?.request || []) {
        before = await interceptor(before)
      }

      const response = await this.call(before)

      const outcome = await outcomify<Data>(response)

      let after: ResponseContext<Data> = {
        method: before.method,
        endpoint: before.endpoint,
        outcome,
        raw: response,
      }

      for (const interceptor of this._options.interceptors?.response || []) {
        after = await interceptor(after)
      }

      if (!after.outcome.success) {
        throw response
      }

      if (options?.verify && !options.verify(after.outcome.data)) {
        throw new VerifyError()
      }

      this._options.interceptors?.on?.success?.(after.outcome)

      return after.outcome
    } catch (thrown) {
      const failed = await failify(thrown)

      if (this._options.interceptors?.on) {
        if (failed.status === StatusCodes.UNAUTHORIZED) {
          this._options.interceptors.on.unauthorized?.(failed)
        } else {
          this._options.interceptors.on.failure?.(failed)
        }
      }

      return failed
    }
  }

  async get<Data>(
    endpoint: Endpoint<Base>,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('GET', endpoint, undefined, options)
  }

  async post<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('POST', endpoint, body, options)
  }

  async put<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('PUT', endpoint, body, options)
  }

  async delete<Data>(
    endpoint: Endpoint<Base>,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('DELETE', endpoint, undefined, options)
  }

  async patch<Data, Body = unknown>(
    endpoint: Endpoint<Base>,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('PATCH', endpoint, body, options)
  }

  extend<const Options extends Partial<HttpOptions> = Partial<HttpOptions>>(
    options: Options,
  ): Http<
    Options extends { base: infer ChildBase extends string }
      ? ChildBase extends ''
        ? Base
        : Join<Base, ChildBase>
      : Base
  > {
    const merged = this.options(this._options, options)

    if (options.base && merged.base) {
      assertUrl(merged.base, merged.unsafe, merged.localhost)
    }

    return new Http(merged) as Http<
      Options extends { base: infer ChildBase extends string }
        ? ChildBase extends ''
          ? Base
          : Join<Base, ChildBase>
        : Base
    >
  }

  private endpoint<Data>(route: string, options?: RequestOptions<Data>): Endpoint<Base> {
    const base = options?.base || this._options.base || defaults.base || ''
    let endpoint = (() => {
      if (route.includes('://')) {
        return route
      }

      if (!route) {
        return base
      }

      const normalized = {
        base: base.replace(/\/+$/, ''),
        route: route.startsWith('/') ? route : `/${route}`,
      }

      return `${normalized.base}${normalized.route}`
    })()

    if (options?.queries) {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(options.queries)) {
        query.append(key, String(value))
      }

      const search = query.toString()
      if (search) {
        const separator = (() => {
          if (endpoint.endsWith('?') || endpoint.endsWith('&')) {
            return ''
          }

          return endpoint.includes('?') ? '&' : '?'
        })()

        endpoint = `${endpoint}${separator}${search}`
      }
    }

    if (endpoint.length > UrlTooLongError.MaxLength) {
      throw new UrlTooLongError()
    }

    if (endpoint.includes('://')) {
      try {
        new URL(endpoint)
      } catch (_thrown) {
        throw new InvalidUrlError()
      }

      assertUrl(
        endpoint,
        options?.unsafe ?? this._options.unsafe,
        options?.localhost ?? this._options.localhost,
      )
    }

    return endpoint
  }

  private options(parent: HttpOptions, child: Partial<HttpOptions>): HttpOptions {
    const base = (() => {
      if (!child.base) {
        return parent.base
      }

      if (!parent.base) {
        return child.base
      }

      if (child.base.startsWith('http://') || child.base.startsWith('https://')) {
        return child.base
      }

      if (child.base.startsWith('/')) {
        const parsed = new URL(parent.base)

        return `${parsed.origin}${child.base}`
      }

      return new URL(
        child.base,
        parent.base.endsWith('/') ? parent.base : `${parent.base}/`,
      ).toString()
    })()

    const headers = {
      ...parent.headers,
      ...child.headers,
    }

    const request = [
      ...(parent.interceptors?.request ?? []),
      ...(child.interceptors?.request ?? []),
    ]

    const response = [
      ...(child.interceptors?.response ?? []),
      ...(parent.interceptors?.response ?? []),
    ]

    const on = (() => {
      const merged: OnInterceptor = {}

      merged.success = chain(parent.interceptors?.on?.success, child.interceptors?.on?.success)
      merged.unauthorized = chain(
        parent.interceptors?.on?.unauthorized,
        child.interceptors?.on?.unauthorized,
      )
      merged.failure = chain(parent.interceptors?.on?.failure, child.interceptors?.on?.failure)

      return Object.keys(merged).length > 0 ? merged : undefined
    })()

    return {
      base,
      timeout: child.timeout !== undefined ? child.timeout : parent.timeout,
      headers,
      interceptors: {
        request,
        response,
        on,
      },
      credentials: child.credentials !== undefined ? child.credentials : parent.credentials,
      unsafe: child.unsafe !== undefined ? child.unsafe : parent.unsafe,
      localhost: child.localhost !== undefined ? child.localhost : parent.localhost,
    }
  }

  private async call<Data>(context: RequestContext<Data>): Promise<Response> {
    const {
      method,
      endpoint,
      options: { headers: _headers, ...options },
      body,
    } = context
    const timeout = options.timeout ?? this._options.timeout ?? defaults.timeout

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const headers = { ...(_headers || {}) } as Record<string, string>
      const found = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
      if (body && !found && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      assertMetadata(headers)

      const response = await fetch(endpoint, {
        ...options,
        method,
        headers,
        body:
          body && typeof body === 'object' && !(body instanceof FormData)
            ? JSON.stringify(body)
            : ((body as BodyInit | undefined) ?? undefined),
        signal: controller.signal,
        redirect: 'follow',
      })

      return response
    } finally {
      clearTimeout(timer)
    }
  }
}

export const create = <const Options extends Partial<HttpOptions>>(
  options?: Options,
): Http<Options extends { base: infer Base extends string } ? Base : DefaultBase> => {
  return new Http(options) as Http<
    Options extends { base: infer Base extends string } ? Base : DefaultBase
  >
}
