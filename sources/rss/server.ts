import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import { HttpDefaultOptions } from '../http/core/options'
import * as Http from '../http/server'
import type { Feed } from './core/models'
import { FeedParser } from './core/parser'
import { isFunction, isString, outcomify } from '../http/core/helpers'
import type { HttpOptions, Outcome } from '../http/core/models'

export const server = (options?: HttpOptions) => {
  const http = Http.server({
    ...HttpDefaultOptions,
    ...options,
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
      ...options?.headers,
    },
  })

  const parser = new FeedParser()

  const get = async (source: Http.GetSource): Promise<Outcome<Feed>> => {
    const resolved = isFunction(source) ? await source() : source

    const response = isString(resolved)
      ? await http.get<string>(resolved)
      : await outcomify<string>(resolved)

    if (!response.success) {
      return response
    }

    try {
      const feed = await parser.parse(response.data)

      return {
        success: true,
        status: response.status,
        data: feed,
      }
    } catch (thrown) {
      return {
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message:
          thrown instanceof Error
            ? thrown.message
            : getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      }
    }
  }

  return {
    get,
  }
}
