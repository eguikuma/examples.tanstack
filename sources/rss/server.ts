import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { server as http } from '../http/server'
import type { HttpOptions, Result } from '../http/core'
import { HttpDefaultOptions } from '../http/core/options'
import type { Feed } from './core/models'
import { FeedParser } from './core/parser'

export const server = (options?: HttpOptions) => {
  const fetcher = http({
    base: '',
    timeout: HttpDefaultOptions.Timeout,
    ...options,
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
      ...options?.headers,
    },
  })

  const parser = new FeedParser()

  const get = async (endpoint: string): Promise<Result<Feed>> => {
    const result = await fetcher.get<string>(endpoint)

    if (!result.success) {
      return result
    }

    try {
      const feed = await parser.parse(result.data)

      return {
        success: true,
        status: result.status,
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
