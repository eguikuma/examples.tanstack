import { content, error, url, metadata } from './helpers'
import { InvalidUrlError, UrlTooLongError, VerifyError } from './errors'
import type {
  HttpOptions,
  Method,
  RequestOptions,
  RequestContext,
  ResponseContext,
  Result,
} from './models'

export class Http {
  private readonly options: HttpOptions

  constructor(options: HttpOptions = {}) {
    this.options = {
      timeout: 10000,
      credentials: 'same-origin',
      ...options,
      interceptors: {
        request: options.interceptors?.request || [],
        response: options.interceptors?.response || [],
        failure: options.interceptors?.failure,
      },
    }
  }

  async request<Data>(
    method: Method,
    endpoint: string,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    try {
      let context: RequestContext<Data> = {
        method,
        endpoint: this.build(endpoint, options),
        options: this.merge(options),
        body,
      }

      for (const interceptor of this.options.interceptors?.request || []) {
        context = await interceptor(context)
      }

      const response = await this.timeout(context)

      const raw = await content(response)

      if (options?.verify && !options.verify(raw as Data)) {
        throw new VerifyError()
      }

      const data = raw as Data

      let result: ResponseContext<Data> = {
        response,
        data,
      }

      for (const interceptor of this.options.interceptors?.response || []) {
        result = await interceptor(result)
      }

      return {
        success: true,
        status: response.status,
        data: result.data,
      }
    } catch (thrown) {
      const interceptor = this.options.interceptors?.failure
      if (interceptor) {
        return await interceptor(thrown, {
          method,
          endpoint: this.build(endpoint, options),
          options: this.merge(options),
          body,
        })
      }

      return error(thrown)
    }
  }

  async get<Data>(endpoint: string, options?: RequestOptions<Data>): Promise<Result<Data>> {
    return this.request<Data>('GET', endpoint, undefined, options)
  }

  async post<Data>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return this.request<Data>('POST', endpoint, body, options)
  }

  async put<Data>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return this.request<Data>('PUT', endpoint, body, options)
  }

  async delete<Data>(endpoint: string, options?: RequestOptions<Data>): Promise<Result<Data>> {
    return this.request<Data>('DELETE', endpoint, undefined, options)
  }

  async patch<Data>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions<Data>,
  ): Promise<Result<Data>> {
    return this.request<Data>('PATCH', endpoint, body, options)
  }

  private build<Data>(route: string, options?: RequestOptions<Data>): string {
    const base = options?.base || this.options.base || ''
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

      url(
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
      credentials: options?.credentials || this.options.credentials,
      timeout: options?.timeout || this.options.timeout,
      localhost: options?.localhost !== undefined ? options.localhost : this.options.localhost,
    }
  }

  private async timeout<Data>(context: RequestContext<Data>): Promise<Response> {
    const { method, endpoint, options, body } = context
    const timeout = options.timeout || this.options.timeout || 10000

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const headers = { ...(options.headers || {}) } as Record<string, string>
      const found = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
      if (body && !found) {
        headers['Content-Type'] = 'application/json'
      }

      metadata(headers)

      const response = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: options.credentials,
        signal: controller.signal,
        redirect: 'follow',
        ...options,
      })

      if (!response.ok) {
        throw response
      }

      return response
    } finally {
      clearTimeout(timer)
    }
  }
}

export const create = (options?: HttpOptions): Http => {
  return new Http(options)
}
