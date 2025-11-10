import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import type { FailureInterceptor, Failed } from '../models'
import { abort } from '../helpers'

export type CaptorOptions = {
  unauthorized?: (failure: Failed) => void
  failure?: (failure: Failed) => void
}

export const captor = (options: CaptorOptions = {}): FailureInterceptor => {
  return async (thrown, _context) => {
    let result: Failed

    if (thrown instanceof Response) {
      const status = thrown.status

      try {
        const data = (await thrown.clone().json()) as {
          message?: string
          issues?: Record<string, string[]>
        }
        result = {
          success: false,
          status,
          message: data.message || getReasonPhrase(status),
          issues: data.issues,
        }
      } catch (_thrown) {
        result = {
          success: false,
          status,
          message: getReasonPhrase(status),
        }
      }
    } else if (thrown instanceof Error) {
      if (abort(thrown)) {
        result = {
          success: false,
          status: StatusCodes.REQUEST_TIMEOUT,
          message: getReasonPhrase(StatusCodes.REQUEST_TIMEOUT),
        }
      } else {
        result = {
          success: false,
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: thrown.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        }
      }
    } else {
      result = {
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      }
    }

    if (result.status === StatusCodes.UNAUTHORIZED) {
      options.unauthorized?.(result)
    } else {
      options.failure?.(result)
    }

    return result
  }
}
