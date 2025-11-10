import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import type { Result } from './models'
import { VerifyError, UnsafeUrlError, InvalidMetadataError } from './errors'

const MaxIso88591CharCode = 255

const PrivateIpOptions = {
  ClassA: { First: 10 },
  ClassB: { First: 172, SecondMin: 16, SecondMax: 31 },
  ClassC: { First: 192, Second: 168 },
  Loopback: { First: 127 },
  LinkLocal: { First: 169, Second: 254 },
  ZeroAddress: { First: 0 },
} as const

export const content = async (response: Response): Promise<unknown> => {
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

export const parse = async <Data>(
  response: Response,
  verify?: (data: Data) => boolean,
): Promise<Result<Data>> => {
  if (!response.ok) {
    throw response
  }

  const raw = await content(response)

  if (verify && !verify(raw as Data)) {
    throw new VerifyError()
  }

  const data = raw as Data

  return {
    success: true,
    status: response.status,
    data,
  }
}

export const json = async <Data>(response: Response): Promise<Result<Data>> => {
  const data = await response.json()

  return {
    success: true,
    status: response.status,
    data,
  }
}

/* biome-ignore lint/suspicious/noExplicitAny: 汎用的な関数型判定のため */
export const callable = (source: unknown): source is (...args: any[]) => any =>
  typeof source === 'function'

export const abort = (thrown: unknown): boolean => {
  return thrown instanceof Error && thrown.name === 'AbortError'
}

export const error = (thrown: unknown): Result<never> => {
  if (thrown instanceof Response) {
    return {
      success: false,
      status: thrown.status,
      message: getReasonPhrase(thrown.status),
    }
  }

  if (thrown instanceof Error) {
    if (abort(thrown)) {
      return {
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: getReasonPhrase(StatusCodes.REQUEST_TIMEOUT),
      }
    }

    if (thrown instanceof VerifyError) {
      return {
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: thrown.message,
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

export const metadata = (values: Record<string, string>): void => {
  for (const value of Object.values(values)) {
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > MaxIso88591CharCode) {
        throw new InvalidMetadataError()
      }
    }
  }
}

export const url = (value: string, unsafe?: boolean, localhost?: boolean): void => {
  if (unsafe) {
    return
  }

  const parsed = new URL(value)

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError()
  }

  const hostname = parsed.hostname.toLowerCase()

  if (hostname === 'localhost' && !localhost) {
    throw new UnsafeUrlError()
  }

  if (hostname.includes(':')) {
    if (hostname === '[::1]' || hostname === '[::]') {
      throw new UnsafeUrlError()
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

  const parts = hostname.split('.').map(Number)
  const [first, second] = parts

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
