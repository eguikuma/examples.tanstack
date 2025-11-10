'use client'

import type {
  MutationStatus,
  QueryStatus,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  UseInfiniteQueryResult,
  InfiniteData,
  InvalidateQueryFilters,
} from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { StatusCodes, getReasonPhrase } from 'http-status-codes'
import type { Http } from './core/request'
import { create } from './core/request'
import type { HttpOptions, Failed, Method, RequestOptions, Result } from './core/models'
import { callable, parse, json } from './core/helpers'
import { HttpDefaultOptions } from './core/options'

export type ReactQueryOptions<Data = unknown> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Data
  options?: RequestOptions<Data>
  extras?: Omit<UseQueryOptions<Data, Error>, 'queryKey' | 'queryFn' | 'enabled' | 'initialData'>
}

export type ReactInfiniteQueryOptions<Data = unknown> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Data
  page?: number
}

type Invalidate = {
  key: unknown[]
  mode?: InvalidateQueryFilters['type']
}

export type ReactMutationOptions<Data, Variables = void> = {
  key?: unknown[]
  success?: (result: Result<Data>, variables: Variables) => void
  failure?: (result: Failed, variables: Variables) => void
  invalidates?: (Invalidate | unknown[])[]
  options?: RequestOptions<Data>
  extras?: Omit<
    UseMutationOptions<Result<Data>, Error, Variables>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  >
}

export type QueryResult<Data> = {
  pending: boolean
  success: boolean
  error: boolean
  fetching: boolean
  loading: boolean
  refetching: boolean
  stale: boolean
  data: Data | undefined
  failure: Error | null
  status: QueryStatus
  refetch: () => void
}

export type InfiniteQueryResult<Data> = {
  pending: boolean
  success: boolean
  error: boolean
  fetching: boolean
  loading: boolean
  refetching: boolean
  paging: boolean
  more: boolean
  stale: boolean
  pages: Data[]
  failure: Error | null
  status: QueryStatus
  next: () => void
  refetch: () => void
}

export type MutationResult<Data, Variables> = {
  pending: boolean
  success: boolean
  error: boolean
  idle: boolean
  failure: Error | null
  status: MutationStatus
  mutate: (variables: Variables) => void
  execute: (variables: Variables) => Promise<Data>
  reset: () => void
}

export const converter = {
  query: <Data>(result: UseQueryResult<Data, Error>): QueryResult<Data> => ({
    pending: result.isPending,
    success: result.isSuccess,
    error: result.isError,
    fetching: result.isFetching,
    loading: result.isLoading,
    refetching: result.isRefetching,
    stale: result.isStale,
    data: result.data,
    failure: result.error,
    status: result.status,
    refetch: result.refetch,
  }),
  infinite: <Data>(
    result: UseInfiniteQueryResult<InfiniteData<Data>, Error>,
  ): InfiniteQueryResult<Data> => ({
    pending: result.isPending,
    success: result.isSuccess,
    error: result.isError,
    fetching: result.isFetching,
    loading: result.isLoading,
    refetching: result.isRefetching,
    paging: result.isFetchingNextPage,
    more: result.hasNextPage || false,
    stale: result.isStale,
    pages: result.data?.pages ?? [],
    failure: result.error,
    status: result.status,
    next: () => result.hasNextPage && !result.isFetchingNextPage && result.fetchNextPage(),
    refetch: result.refetch,
  }),
  mutation: <Data, Variables>(
    result: UseMutationResult<Data, Error, Variables>,
  ): MutationResult<Data, Variables> => ({
    pending: result.isPending,
    success: result.isSuccess,
    error: result.isError,
    idle: result.isIdle,
    failure: result.error,
    status: result.status,
    mutate: result.mutate,
    execute: result.mutateAsync,
    reset: result.reset,
  }),
}

export const react = (options?: HttpOptions) => {
  const http = create({
    base: '',
    timeout: HttpDefaultOptions.Timeout,
    credentials: 'same-origin',
    ...options,
  })

  return {
    get: getter(http),
    infinite: infiniter(http),
    post: poster(http),
    put: updater(http),
    delete: remover(http),
    patch: patcher(http),
  }
}

const execute = async <Data>(
  http: Http,
  method: Method,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions<Data>,
): Promise<Result<Data>> => {
  if (method === 'GET') {
    return http.get<Data>(endpoint, options)
  }

  if (method === 'POST') {
    return http.post<Data>(endpoint, body, options)
  }

  if (method === 'PUT') {
    return http.put<Data>(endpoint, body, options)
  }

  if (method === 'PATCH') {
    return http.patch<Data>(endpoint, body, options)
  }

  return http.delete<Data>(endpoint, options)
}

export const handler = <Data, Variables>(
  success?: (result: Result<Data>, variables: Variables) => void,
  failure?: (result: Failed, variables: Variables) => void,
) => {
  return (result: Result<Data>, variables: Variables) => {
    if (!result.success) {
      failure?.(result, variables)

      return
    }

    success?.(result, variables)
  }
}

const getter = (http: Http) => {
  function get<Data>(
    action: () => Promise<Response | Result<Data>>,
    parameters: ReactQueryOptions<Data>,
  ): QueryResult<Data>

  function get<Data>(endpoint: string, parameters: ReactQueryOptions<Data>): QueryResult<Data>

  function get<Data>(
    source: string | (() => Promise<Response | Result<Data>>),
    parameters: ReactQueryOptions<Data>,
  ): QueryResult<Data> {
    const { key, enabled, defaults, options, extras } = parameters

    const result = useQuery({
      queryKey: key,
      queryFn: async () => {
        let result: Result<Data>

        if (callable(source)) {
          try {
            const response = await source()

            if (response instanceof Response) {
              result = await parse<Data>(response, options?.verify)
            } else {
              result = response
            }
          } catch (thrown) {
            if (thrown instanceof Response) {
              throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
            }

            if (thrown instanceof Error) {
              throw thrown
            }

            throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
          }
        } else {
          result = await execute<Data>(http, 'GET', source as string, undefined, options)
        }

        if (!result.success) {
          throw new Error(result.message)
        }

        return result.data
      },
      enabled,
      initialData: defaults,
      ...extras,
    })

    return converter.query(result)
  }

  return get
}

const infiniter = (http: Http) => {
  function infinite<Data>(
    action: (page: number) => Promise<Response | Result<Data>>,
    parameters: ReactInfiniteQueryOptions<Data> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
    },
  ): InfiniteQueryResult<Data>

  function infinite<Data>(
    endpoint: (page: number) => string,
    parameters: ReactInfiniteQueryOptions<Data> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
    },
  ): InfiniteQueryResult<Data>

  function infinite<Data>(
    source: string | ((page: number) => Promise<Response | Result<Data>> | string),
    parameters: ReactInfiniteQueryOptions<Data> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
    },
  ): InfiniteQueryResult<Data> {
    const { key, enabled, defaults, page, next } = parameters

    const result = useInfiniteQuery<Data, Error, InfiniteData<Data>, unknown[], number>({
      queryKey: key,
      queryFn: async (context) => {
        let result: Result<Data>

        if (callable(source)) {
          const response = source(context.pageParam)

          if (response instanceof Promise) {
            try {
              const resolved = await response

              if (resolved instanceof Response) {
                result = await parse<Data>(resolved)
              } else {
                result = resolved
              }
            } catch (thrown) {
              if (thrown instanceof Response) {
                throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
              }

              if (thrown instanceof Error) {
                throw thrown
              }

              throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
            }
          } else {
            result = await execute<Data>(http, 'GET', response as string, undefined, undefined)
          }
        } else {
          result = await execute<Data>(http, 'GET', source as string, undefined, undefined)
        }

        if (!result.success) {
          throw new Error(result.message)
        }

        return result.data
      },
      getNextPageParam: (last, pages, page) => next(last, pages, page),
      initialPageParam: page || 0,
      initialData: defaults
        ? {
            pages: [defaults],
            pageParams: [page || 0],
          }
        : undefined,
      enabled,
    })

    return converter.infinite(result)
  }

  return infinite
}

const mutator = <Data, Variables>(
  http: Http,
  method: Exclude<Method, 'GET'>,
  source: string | ((variables: Variables) => Promise<Response> | string),
  parameters: ReactMutationOptions<Data, Variables>,
): MutationResult<Result<Data>, Variables> => {
  const { key, success, failure, invalidates, options, extras } = parameters
  const cache = useQueryClient()

  const result = useMutation({
    mutationKey: key,
    mutationFn: async (variables: Variables) => {
      if (callable(source)) {
        const result = source(variables)

        if (result instanceof Promise) {
          try {
            const response = await result

            return await json<Data>(response)
          } catch (thrown) {
            if (thrown instanceof Response) {
              throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
            }
            if (thrown instanceof Error) {
              throw thrown
            }
            throw new Error(getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR))
          }
        }

        const endpoint = result as string

        if (method === 'POST') {
          return execute<Data>(http, 'POST', endpoint, variables, options)
        }

        if (method === 'PUT') {
          return execute<Data>(http, 'PUT', endpoint, variables, options)
        }

        if (method === 'PATCH') {
          return execute<Data>(http, 'PATCH', endpoint, variables, options)
        }

        return execute<Data>(http, 'DELETE', endpoint, options)
      }

      if (method === 'POST') {
        return execute<Data>(http, 'POST', source, variables, options)
      }

      if (method === 'PUT') {
        return execute<Data>(http, 'PUT', source, variables, options)
      }

      if (method === 'PATCH') {
        return execute<Data>(http, 'PATCH', source, variables, options)
      }

      return execute<Data>(http, 'DELETE', source, options)
    },
    onSuccess: (result, variables) => {
      if (invalidates && result.success) {
        for (const filter of invalidates) {
          if (Array.isArray(filter)) {
            cache.invalidateQueries({ queryKey: filter })
          } else {
            cache.invalidateQueries({ queryKey: filter.key, type: filter.mode })
          }
        }
      }

      handler(success, failure)(result, variables)
    },
    ...extras,
  })

  return converter.mutation(result)
}

const poster = (http: Http) => {
  function post<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function post<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function post<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function post<Data, Variables = unknown>(
    source: string | ((variables: Variables) => Promise<Response> | string),
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables> {
    return mutator(http, 'POST', source, parameters)
  }

  return post
}

const updater = (http: Http) => {
  function put<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function put<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function put<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function put<Data, Variables = unknown>(
    source: string | ((variables: Variables) => Promise<Response> | string),
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables> {
    return mutator(http, 'PUT', source, parameters)
  }

  return put
}

const remover = (http: Http) => {
  function remove<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function remove<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function remove<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function remove<Data, Variables = unknown>(
    source: string | ((variables: Variables) => Promise<Response> | string),
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables> {
    return mutator(http, 'DELETE', source, parameters)
  }

  return remove
}

const patcher = (http: Http) => {
  function patch<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function patch<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function patch<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables>

  function patch<Data, Variables = unknown>(
    source: string | ((variables: Variables) => Promise<Response> | string),
    parameters: ReactMutationOptions<Data, Variables>,
  ): MutationResult<Result<Data>, Variables> {
    return mutator(http, 'PATCH', source, parameters)
  }

  return patch
}
