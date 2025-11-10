'use client'

import { StatusCodes } from 'http-status-codes'

import * as Rss from './server'
import { isFunction, isResponse, isString, outcomify } from '../http/core/helpers'
import * as Http from '../http/react.client'
import type { Feed, PagedFeed } from './core/models'
import type { HttpOptions, Outcome } from '../http/core/models'

export const react = (options?: HttpOptions) => {
  const rss = Rss.server(options)
  const http = Http.react(options)

  const get = (
    source: Http.ReactQuerySource<Feed>,
    parameters: Http.ReactQueryParameters<Feed>,
  ): Http.ReactQueryOutcome<Feed> =>
    http.get(isFunction(source) ? source : () => rss.get(source), parameters)

  const infinite = (
    source: Http.ReactInfiniteQuerySource<Feed>,
    parameters: Http.ReactQueryParameters<Feed> & { size: number },
  ): Http.ReactInfiniteQueryOutcome<PagedFeed> => {
    let cached: Feed | null = null

    const { size, defaults, ...rest } = parameters

    return http.infinite<PagedFeed, Feed>(
      async (page): Promise<Outcome<Feed>> => {
        if (!cached) {
          const resolved = isFunction(source) ? await source(page) : source

          const response = isString(source)
            ? await rss.get(source)
            : isResponse(resolved)
              ? await outcomify<Feed>(resolved)
              : isString(resolved)
                ? await rss.get(resolved)
                : resolved

          if (!response.success) {
            return response
          }

          cached = response.data
        }

        return {
          success: true,
          status: StatusCodes.OK,
          data: cached,
        }
      },
      {
        ...rest,
        defaults,
        transform: (feed, page) => {
          const start = page * size
          const end = start + size

          return {
            entries: feed.entries.slice(start, end),
            total: feed.entries.length,
            next: end < feed.entries.length ? page + 1 : undefined,
          }
        },
        next: (last) => last.next,
      },
    )
  }

  return {
    get,
    infinite,
  }
}
