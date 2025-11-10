export type Success<Data> = {
  success: true
  status: number
  data: Data
}

export type Failed = {
  success: false
  status: number
  message: string
  body?: unknown
}

export type Outcome<Data> = Success<Data> | Failed

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type RequestOptions<Data = unknown> = Omit<RequestInit, 'method' | 'body'> & {
  queries?: Record<string, string | number | boolean>
  timeout?: number
  base?: string
  verify?: (data: Data) => boolean
  unsafe?: boolean
  localhost?: boolean
}

export type RequestContext<Data = unknown> = {
  method: Method
  endpoint: string
  options: RequestOptions<Data>
  body?: unknown
}

export type ResponseContext<Data = unknown> = {
  method: Method
  endpoint: string
  outcome: Outcome<Data>
  raw: Response
}

export type RequestInterceptor = <Data>(
  context: RequestContext<Data>,
) => RequestContext<Data> | Promise<RequestContext<Data>>

export type ResponseInterceptor = <Data>(
  context: ResponseContext<Data>,
) => ResponseContext<Data> | Promise<ResponseContext<Data>>

export type OnInterceptor<Data = unknown> = {
  success?: (success: Success<Data>) => void
  unauthorized?: (failed: Failed) => void
  failure?: (failed: Failed) => void
}

export type Interceptors = {
  request?: RequestInterceptor[]
  response?: ResponseInterceptor[]
  on?: OnInterceptor
}

export type HttpOptions = {
  base?: string
  timeout?: number
  headers?: Record<string, string>
  interceptors?: Interceptors
  credentials?: RequestCredentials
  unsafe?: boolean
  localhost?: boolean
}
