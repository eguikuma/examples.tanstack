export type DefaultBase = '/'

export type Endpoint<Base extends string = string> = string & { readonly __base?: Base }

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

export type ExtendedBase<
  Base extends string,
  Extended extends Partial<HttpOptions>,
> = Extended extends { base: infer ChildBase extends string }
  ? ChildBase extends ''
    ? Base
    : Join<Base, ChildBase>
  : Base

type Origin<Value extends string> = Value extends `${infer Protocol}://${infer Host}/${infer _$}`
  ? `${Protocol}://${Host}`
  : Value extends `${infer Protocol}://${infer Host}`
    ? `${Protocol}://${Host}`
    : never

type HasStartSlash<Value extends string> = Value extends `/${infer _$}` ? true : false

type HasProtocol<Value extends string> = Value extends `http://${infer _$}`
  ? true
  : Value extends `https://${infer _$}`
    ? true
    : false

type TrimEndSlash<Value extends string> = Value extends `${infer Segment}/`
  ? TrimEndSlash<Segment>
  : Value

type TrimStartSlash<Value extends string> = Value extends `/${infer Segment}` ? Segment : Value

export type Join<Parent extends string, Child extends string> = Child extends ''
  ? Parent
  : HasProtocol<Child> extends true
    ? Child
    : HasStartSlash<Child> extends true
      ? HasProtocol<Parent> extends true
        ? Origin<Parent> extends infer ParentOrigin
          ? ParentOrigin extends string
            ? `${ParentOrigin}${Child}`
            : never
          : never
        : Child
      : Parent extends ''
        ? Child
        : `${TrimEndSlash<Parent>}/${TrimStartSlash<Child>}`

type ToNumber<Value extends string> = Value extends `${infer Number extends number}`
  ? Number
  : never

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type SuccessStatusCode = ToNumber<`20${Digit}` | `21${Digit}` | `22${Digit}`>
