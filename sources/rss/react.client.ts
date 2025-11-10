'use client'

import type { Feed, PagedFeed } from './core/models'
import * as Rss from './server'
import { successify, unify } from '../http/core/helpers'
import type { DefaultBase, ExtendedBase, HttpOptions } from '../http/core/models'
import * as Http from '../http/react.client'

type Methods<Base extends string> = {
  get: (
    source: Rss.GetSource<Base>,
    parameters: Http.ReactQueryParameters<Feed>,
  ) => Http.ReactQueryOutcome<Feed>
  infinite: (
    source: Http.ReactInfiniteQuerySource<Base, Feed>,
    parameters: Http.ReactQueryParameters<Feed> & { size: number },
  ) => Http.ReactInfiniteQueryOutcome<PagedFeed>
}

export type Builder<Base extends string> = Methods<Base> & {
  extend: <const Extended extends Partial<HttpOptions>>(
    extended: Extended,
  ) => Builder<ExtendedBase<Base, Extended>>
}

const builder = <Base extends string>(
  rss: Rss.Builder<Base>,
  http: Http.Builder<Base>,
): Builder<Base> => {
  const get = (
    source: Rss.GetSource<Base>,
    parameters: Http.ReactQueryParameters<Feed>,
  ): Http.ReactQueryOutcome<Feed> => http.get(() => rss.get(source), parameters)

  const infinite = (
    source: Http.ReactInfiniteQuerySource<Base, Feed>,
    parameters: Http.ReactQueryParameters<Feed> & { size: number },
  ): Http.ReactInfiniteQueryOutcome<PagedFeed> => {
    let cached: Feed | null = null

    const { size, defaults, ...rest } = parameters

    return http.infinite<PagedFeed, Feed>(
      async ({ page }) => {
        if (!cached) {
          const response = await unify<Feed, [Http.ReactInfiniteQueryVariables]>({
            source,
            parameters: [{ page }],
            executor: (endpoint) => rss.get(endpoint),
          })

          if (!response.success) {
            return response
          }

          cached = response.data
        }

        return successify(cached)
      },
      {
        ...rest,
        defaults,
        transform: (feed, variables) => {
          const start = variables.page * size
          const end = start + size

          return {
            entries: feed.entries.slice(start, end),
            total: feed.entries.length,
            next: end < feed.entries.length ? variables.page + 1 : undefined,
          }
        },
        next: ({ last }) => (last.data.next !== undefined ? { page: last.data.next } : undefined),
      },
    )
  }

  return {
    get,
    infinite,
    extend: <const Extended extends Partial<HttpOptions>>(extended: Extended) =>
      builder(rss.extend(extended), http.extend(extended)),
  }
}

export const react = <const Options extends Partial<HttpOptions>>(
  options?: Options,
): Builder<ExtendedBase<DefaultBase, Options>> =>
  builder(
    Rss.server(options) as Rss.Builder<ExtendedBase<DefaultBase, Options>>,
    Http.react(options) as Http.Builder<ExtendedBase<DefaultBase, Options>>,
  )
