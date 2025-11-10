import { StatusCodes } from 'http-status-codes'

import { InvalidUrlError, UrlTooLongError, VerifyError } from './errors'
import { assertMetadata, assertUrl, failify, outcomify } from './helpers'
import type {
  HttpOptions,
  Method,
  RequestOptions,
  RequestContext,
  ResponseContext,
  Outcome,
} from './models'
import { HttpDefaultOptions } from './options'

export class Http {
  private readonly options: HttpOptions

  constructor(options: HttpOptions = {}) {
    this.options = {
      ...HttpDefaultOptions,
      ...options,
      interceptors: {
        request: options.interceptors?.request || [],
        response: options.interceptors?.response || [],
        on: options.interceptors?.on,
      },
    }
  }

  async request<Data>(
    method: Method,
    endpoint: string,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    try {
      let before: RequestContext<Data> = {
        method,
        endpoint: this.build(endpoint, options),
        options: this.merge(options),
        body,
      }

      for (const interceptor of this.options.interceptors?.request || []) {
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

      for (const interceptor of this.options.interceptors?.response || []) {
        after = await interceptor(after)
      }

      if (!after.outcome.success) {
        throw response
      }

      if (options?.verify && !options.verify(after.outcome.data)) {
        throw new VerifyError()
      }

      this.options.interceptors?.on?.success?.(after.outcome)

      return after.outcome
    } catch (thrown) {
      const failed = await failify(thrown)

      if (this.options.interceptors?.on) {
        if (failed.status === StatusCodes.UNAUTHORIZED) {
          this.options.interceptors.on.unauthorized?.(failed)
        } else {
          this.options.interceptors.on.failure?.(failed)
        }
      }

      return failed
    }
  }

  async get<Data>(endpoint: string, options?: RequestOptions<Data>): Promise<Outcome<Data>> {
    return this.request<Data>('GET', endpoint, undefined, options)
  }

  async post<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('POST', endpoint, body, options)
  }

  async put<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('PUT', endpoint, body, options)
  }

  async delete<Data>(endpoint: string, options?: RequestOptions<Data>): Promise<Outcome<Data>> {
    return this.request<Data>('DELETE', endpoint, undefined, options)
  }

  async patch<Data, Body = unknown>(
    endpoint: string,
    body?: Body,
    options?: RequestOptions<Data>,
  ): Promise<Outcome<Data>> {
    return this.request<Data>('PATCH', endpoint, body, options)
  }

  private build<Data>(route: string, options?: RequestOptions<Data>): string {
    const base = options?.base || this.options.base || HttpDefaultOptions.base
    let endpoint = route.startsWith('http') ? route : `${base}${route}`

    if (options?.queries) {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(options.queries)) {
        query.append(key, String(value))
      }

      const search = query.toString()
      if (search) {
        endpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${search}`
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
        options?.unsafe || this.options.unsafe,
        options?.localhost || this.options.localhost,
      )
    }

    return endpoint
  }

  private merge<Data>(options?: RequestOptions<Data>): RequestOptions<Data> {
    return {
      ...options,
      headers: {
        ...this.options.headers,
        ...options?.headers,
      },
      credentials: options?.credentials ?? this.options.credentials,
      timeout: options?.timeout ?? this.options.timeout,
      localhost: options?.localhost !== undefined ? options.localhost : this.options.localhost,
    }
  }

  private async call<Data>(context: RequestContext<Data>): Promise<Response> {
    const {
      method,
      endpoint,
      options: { headers: _headers, ...options },
      body,
    } = context
    const timeout = options.timeout ?? this.options.timeout ?? HttpDefaultOptions.timeout

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

export const create = (options?: HttpOptions): Http => {
  return new Http(options)
}
