import { StatusCodes, getReasonPhrase } from 'http-status-codes'

import { UnsafeUrlError, InvalidMetadataError, VerifyError } from './errors'
import type { Failed, Outcome, Success, SuccessStatusCode } from './models'

const PrivateIpOptions = {
  ClassA: { First: 10 },
  ClassB: { First: 172, SecondMin: 16, SecondMax: 31 },
  ClassC: { First: 192, Second: 168 },
  Loopback: { First: 127 },
  LinkLocal: { First: 169, Second: 254 },
  ZeroAddress: { First: 0 },
} as const

export const unwrap = async (response: Response): Promise<unknown> => {
  const type = response.headers.get('Content-Type')

  if (type?.includes('application/json')) {
    return response.json()
  }

  if (type?.includes('xml')) {
    return response.text()
  }

  if (type?.includes('text/')) {
    return response.text()
  }

  if (response.status === StatusCodes.NO_CONTENT) {
    return undefined
  }

  return response.text()
}

export const outcomify = async <Data>(
  response: Response,
  verify?: (data: Data) => boolean,
): Promise<Outcome<Data>> => {
  const unwrapped = await unwrap(response)

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      message: getReasonPhrase(response.status),
      body: unwrapped,
    }
  }

  if (verify && !(await verify(unwrapped as Data))) {
    throw new VerifyError()
  }

  return {
    success: true,
    status: response.status,
    data: unwrapped as Data,
  }
}

export const successify = <Data>(
  data: Data,
  status: SuccessStatusCode = StatusCodes.OK,
): Success<Data> => ({
  success: true,
  status,
  data,
})

export const failify = async (thrown: unknown): Promise<Failed> => {
  if (thrown instanceof Response) {
    const status = thrown.status

    try {
      const body = await thrown.clone().json()

      return {
        success: false,
        status,
        message: body.message || getReasonPhrase(status),
        body,
      }
    } catch {
      return {
        success: false,
        status,
        message: getReasonPhrase(status),
      }
    }
  }

  if (thrown instanceof Error) {
    if (isCancelled(thrown)) {
      return {
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: getReasonPhrase(StatusCodes.REQUEST_TIMEOUT),
      }
    }

    return {
      success: false,
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: thrown.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
    }
  }

  return {
    success: false,
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
  }
}

export async function unify<Data, Parameters extends unknown[]>({
  source,
  parameters = [] as unknown as Parameters,
  executor,
  verify,
}: {
  source:
    | string
    | ((...parameters: Parameters) => string | Outcome<Data> | Promise<string | Outcome<Data>>)
  parameters?: Parameters
  executor: (endpoint: string) => Promise<Outcome<Data>>
  verify?: (data: Data) => boolean
}): Promise<Outcome<Data>> {
  try {
    if (isString(source)) {
      return await executor(source)
    }

    const resolved = await source(...parameters)

    if (isString(resolved)) {
      return await executor(resolved)
    }

    if (resolved.success && verify && !verify(resolved.data)) {
      throw new VerifyError()
    }

    return resolved
  } catch (thrown) {
    return await failify(thrown)
  }
}

export const assertMetadata = (values: Record<string, string>): void => {
  for (const value of Object.values(values)) {
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i)

      if (code > 255 || code < 32 || code === 127) {
        throw new InvalidMetadataError()
      }
    }
  }
}

export const assertUrl = (value: string, unsafe?: boolean, localhost?: boolean): void => {
  const matched = value.match(/^https?:\/\/([^/:?#]+)/)
  const raw = matched ? matched[1] : null

  if (raw) {
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/

    if (ipv4.test(raw)) {
      const octets = raw.split('.')

      if (octets.some((octet) => octet.length > 1 && octet.startsWith('0'))) {
        throw new UnsafeUrlError()
      }

      const parts = octets.map(Number)

      if (parts.some((part) => part < 0 || part > 255)) {
        throw new UnsafeUrlError()
      }
    }
  }

  const parsed = new URL(value)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError()
  }

  if (unsafe) {
    return
  }

  const hostname = parsed.hostname.toLowerCase()

  if (hostname === 'localhost' && !localhost) {
    throw new UnsafeUrlError()
  }

  if (hostname.includes(':')) {
    if (hostname === '[::1]' || hostname === '[::]') {
      if (!localhost) {
        throw new UnsafeUrlError()
      }

      return
    }

    if (hostname.startsWith('[fe80:') || hostname.startsWith('[fe80::')) {
      throw new UnsafeUrlError()
    }

    if (hostname.startsWith('[fc00:') || hostname.startsWith('[fc00::')) {
      throw new UnsafeUrlError()
    }

    if (hostname.startsWith('[fd00:') || hostname.startsWith('[fd00::')) {
      throw new UnsafeUrlError()
    }

    return
  }

  const pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!pattern.test(hostname)) {
    return
  }

  const [first, second] = hostname.split('.').map(Number)

  if (first === PrivateIpOptions.ClassA.First) {
    throw new UnsafeUrlError()
  }

  if (
    first === PrivateIpOptions.ClassB.First &&
    second !== undefined &&
    second >= PrivateIpOptions.ClassB.SecondMin &&
    second <= PrivateIpOptions.ClassB.SecondMax
  ) {
    throw new UnsafeUrlError()
  }

  if (first === PrivateIpOptions.ClassC.First && second === PrivateIpOptions.ClassC.Second) {
    throw new UnsafeUrlError()
  }

  if (first === PrivateIpOptions.Loopback.First && !localhost) {
    throw new UnsafeUrlError()
  }

  if (first === PrivateIpOptions.LinkLocal.First && second === PrivateIpOptions.LinkLocal.Second) {
    throw new UnsafeUrlError()
  }

  if (first === PrivateIpOptions.ZeroAddress.First) {
    throw new UnsafeUrlError()
  }
}

/* biome-ignore lint/suspicious/noExplicitAny: 汎用的な関数型判定のため */
export const isFunction = (source: unknown): source is (...args: any[]) => any =>
  typeof source === 'function'

export const isResponse = (source: unknown): source is Response => source instanceof Response

export const isString = (source: unknown): source is string => typeof source === 'string'

export const isCancelled = (thrown: unknown): boolean =>
  thrown instanceof Error && (thrown.name === 'AbortError' || thrown.name === 'TimeoutError')

/* biome-ignore lint/suspicious/noExplicitAny: 汎用的な関数型のため */
export const chain = <Handler extends (...parameters: any[]) => void>(
  parent?: Handler,
  child?: Handler,
): Handler | undefined => {
  if (parent && child) {
    return ((...parameters) => {
      parent(...parameters)
      child(...parameters)
    }) as Handler
  }

  return parent || child
}
