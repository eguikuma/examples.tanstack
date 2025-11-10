'use client'

import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import {
  converter,
  type QueryResult,
  type ReactQueryOptions,
  type ReactInfiniteQueryOptions,
  type InfiniteQueryResult,
} from '../http/react.client'
import type { HttpOptions, Result } from '../http/core'
import { callable, parse } from '../http/core/helpers'
import type { Feed, PagedFeed } from './core/models'
import { server } from './server'

export const react = (options?: HttpOptions) => {
  const fetcher = server(options)

  const get = (source: string, parameters: ReactQueryOptions<Feed>): QueryResult<Feed> => {
    const { key, enabled, defaults, extras } = parameters

    const result = useQuery({
      queryKey: key,
      queryFn: async () => {
        const response = await fetcher.get(source)

        if (!response.success) {
          throw new Error(response.message)
        }

        return response.data
      },
      enabled,
      initialData: defaults,
      ...extras,
    })

    return converter.query(result)
  }

  const infinite = (
    source: string | ((page: number) => Promise<Response | Result<Feed>>),
    parameters: ReactInfiniteQueryOptions<Feed> & { size: number },
  ): InfiniteQueryResult<PagedFeed> => {
    const { key, enabled, defaults, page, size } = parameters

    const result = useInfiniteQuery<PagedFeed, Error, InfiniteData<PagedFeed>, unknown[], number>({
      queryKey: key,
      queryFn: async (context) => {
        let response: Result<Feed>

        if (callable(source)) {
          try {
            const result = await source(context.pageParam)

            if (result instanceof Response) {
              const parsed = await parse<Feed>(result)

              response = parsed
            } else {
              response = result
            }
          } catch (thrown) {
            throw new Error(thrown instanceof Error ? thrown.message : 'Unknown error')
          }
        } else {
          response = await fetcher.get(source)
        }

        if (!response.success) {
          throw new Error(response.message)
        }

        const start = context.pageParam * size
        const end = start + size
        const entries = response.data.entries.slice(start, end)
        const total = response.data.entries.length

        return {
          entries,
          total,
          next: end < total ? context.pageParam + 1 : undefined,
        }
      },
      getNextPageParam: (last) => last.next,
      initialPageParam: page || 0,
      initialData: defaults
        ? {
            pages: [
              {
                entries: defaults.entries.slice(0, size),
                total: defaults.entries.length,
                next: size < defaults.entries.length ? 1 : undefined,
              },
            ],
            pageParams: [page || 0],
          }
        : undefined,
      enabled,
    })

    return converter.infinite(result)
  }

  return {
    get,
    infinite,
  }
}
