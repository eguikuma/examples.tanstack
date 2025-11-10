'use client'

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
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

import { isFunction, isResponse, isString, outcomify } from './core/helpers'
import type { HttpOptions, Failed, Method, RequestOptions, Outcome } from './core/models'
import { HttpDefaultOptions } from './core/options'
import { create } from './core/request'
import type { Http } from './core/request'

export type ReactQuerySource<Data = unknown> = string | (() => Promise<Response | Outcome<Data>>)

export type ReactQueryParameters<Data = unknown> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Data
  options?: RequestOptions<Data>
  extras?: Omit<UseQueryOptions<Data, Error>, 'queryKey' | 'queryFn' | 'enabled' | 'initialData'>
}

export type ReactQueryOutcome<Data> = {
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

export type ReactQuery<Data> = (
  source: ReactQuerySource<Data>,
  parameters: ReactQueryParameters<Data>,
) => ReactQueryOutcome<Data>

export type ReactInfiniteQuerySource<Data = unknown> =
  | string
  | ((page: number) => Promise<Response | Outcome<Data>> | string)

export type ReactInfiniteQueryParameters<Data = unknown, Source = Data> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Source
  page?: number
}

export type ReactInfiniteQueryOutcome<Data> = {
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

export type ReactInfiniteQuery<Data> = (
  source: ReactInfiniteQuerySource<Data>,
  parameters: ReactInfiniteQueryParameters<Data>,
) => ReactInfiniteQueryOutcome<Data>

export type ReactMutationSource<Variables = unknown> =
  | string
  | ((variables: Variables) => Promise<Response> | string)

export type ReactMutationInvalidate = {
  key: unknown[]
  mode?: InvalidateQueryFilters['type']
}

export type ReactMutationParameters<Data, Variables = void> = {
  key?: unknown[]
  success?: (outcome: Outcome<Data>, variables: Variables) => void
  failure?: (failed: Failed, variables: Variables) => void
  invalidates?: (ReactMutationInvalidate | unknown[])[]
  options?: RequestOptions<Data>
  extras?: Omit<
    UseMutationOptions<Outcome<Data>, Error, Variables>,
    'mutationKey' | 'mutationFn' | 'onSuccess'
  >
}

export type ReactMutationOutcome<Data, Variables> = {
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

export type ReactMutation<Data, Variables = unknown> = (
  source: ReactMutationSource<Variables>,
  parameters: ReactMutationParameters<Data, Variables>,
) => ReactMutationOutcome<Outcome<Data>, Variables>

export const converter = {
  query: <Data>(result: UseQueryResult<Data, Error>): ReactQueryOutcome<Data> => ({
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
  ): ReactInfiniteQueryOutcome<Data> => ({
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
  ): ReactMutationOutcome<Data, Variables> => ({
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
    ...HttpDefaultOptions,
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
): Promise<Outcome<Data>> => {
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
  success?: (outcome: Outcome<Data>, variables: Variables) => void,
  failure?: (failed: Failed, variables: Variables) => void,
) => {
  return (outcome: Outcome<Data>, variables: Variables) => {
    if (!outcome.success) {
      failure?.(outcome, variables)

      return
    }

    success?.(outcome, variables)
  }
}

const getter = (http: Http) => {
  function get<Data>(
    action: () => Promise<Response | Outcome<Data>>,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data>

  function get<Data>(
    endpoint: string,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data>

  function get<Data>(
    source: ReactQuerySource<Data>,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data> {
    const { key, enabled, defaults, options, extras } = parameters

    const response = useQuery({
      queryKey: key,
      queryFn: async () => {
        const resolved = isFunction(source) ? await source() : source

        const response = isString(source)
          ? await execute<Data>(http, 'GET', source, undefined, options)
          : isResponse(resolved)
            ? await outcomify<Data>(resolved, options?.verify)
            : isString(resolved)
              ? await execute<Data>(http, 'GET', resolved, undefined, options)
              : resolved

        if (!response.success) {
          throw new Error(response.message)
        }

        return response.data
      },
      enabled,
      initialData: defaults,
      ...extras,
    })

    return converter.query(response)
  }

  return get
}

const infiniter = (http: Http) => {
  function infinite<Data>(
    action: (page: number) => Promise<Response | Outcome<Data>>,
    parameters: ReactInfiniteQueryParameters<Data, Data> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source>(
    action: (page: number) => Promise<Response | Outcome<Source>>,
    parameters: ReactInfiniteQueryParameters<Data, Source> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
      transform: (source: Source, page: number) => Data
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data>(
    endpoint: (page: number) => string,
    parameters: ReactInfiniteQueryParameters<Data, Data> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source>(
    endpoint: (page: number) => string,
    parameters: ReactInfiniteQueryParameters<Data, Source> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
      transform: (source: Source, page: number) => Data
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source = Data>(
    source: ReactInfiniteQuerySource<Source>,
    parameters: ReactInfiniteQueryParameters<Data, Source> & {
      next: (last: Data, pages: Data[], page: number) => number | undefined
      transform?: (source: Source, page: number) => Data
    },
  ): ReactInfiniteQueryOutcome<Data> {
    const { key, enabled, defaults, page, transform, next } = parameters

    const response = useInfiniteQuery<Data, Error, InfiniteData<Data>, unknown[], number>({
      queryKey: key,
      queryFn: async (context) => {
        const resolved = isFunction(source) ? await source(context.pageParam) : source

        const response = isString(source)
          ? await execute<Source>(http, 'GET', source, undefined, undefined)
          : isResponse(resolved)
            ? await outcomify<Source>(resolved)
            : isString(resolved)
              ? await execute<Source>(http, 'GET', resolved, undefined, undefined)
              : resolved

        if (!response.success) {
          throw new Error(response.message)
        }

        return transform
          ? transform(response.data, context.pageParam)
          : (response.data as unknown as Data)
      },
      getNextPageParam: (last, pages, page) => next(last, pages, page),
      initialPageParam: page || 0,
      initialData:
        defaults && transform
          ? {
              pages: [transform(defaults, page || 0)],
              pageParams: [page || 0],
            }
          : defaults
            ? {
                pages: [defaults as unknown as Data],
                pageParams: [page || 0],
              }
            : undefined,
      enabled,
    })

    return converter.infinite(response)
  }

  return infinite
}

const mutator = <Data, Variables>(
  http: Http,
  method: Exclude<Method, 'GET'>,
  source: ReactMutationSource<Variables>,
  parameters: ReactMutationParameters<Data, Variables>,
): ReactMutationOutcome<Outcome<Data>, Variables> => {
  const { key, success, failure, invalidates, options, extras } = parameters
  const cache = useQueryClient()

  const response = useMutation({
    mutationKey: key,
    mutationFn: async (variables: Variables) => {
      const resolved = isFunction(source) ? await source(variables) : source

      return isString(source)
        ? await execute<Data>(http, method, source, variables, options)
        : isResponse(resolved)
          ? await outcomify<Data>(resolved, options?.verify)
          : isString(resolved)
            ? await execute<Data>(http, method, resolved, variables, options)
            : resolved
    },
    onSuccess: (outcome, variables) => {
      if (invalidates && outcome.success) {
        for (const filter of invalidates) {
          if (Array.isArray(filter)) {
            cache.invalidateQueries({ queryKey: filter })
          } else {
            cache.invalidateQueries({ queryKey: filter.key, type: filter.mode })
          }
        }
      }

      handler(success, failure)(outcome, variables)
    },
    ...extras,
  })

  return converter.mutation(response)
}

const poster = (http: Http) => {
  function post<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function post<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function post<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function post<Data, Variables = unknown>(
    source: ReactMutationSource<Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables> {
    return mutator(http, 'POST', source, parameters)
  }

  return post
}

const updater = (http: Http) => {
  function put<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function put<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function put<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function put<Data, Variables = unknown>(
    source: ReactMutationSource<Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables> {
    return mutator(http, 'PUT', source, parameters)
  }

  return put
}

const remover = (http: Http) => {
  function remove<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function remove<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function remove<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function remove<Data, Variables = unknown>(
    source: ReactMutationSource<Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables> {
    return mutator(http, 'DELETE', source, parameters)
  }

  return remove
}

const patcher = (http: Http) => {
  function patch<Data, Variables = void>(
    action: (variables: Variables) => Promise<Response>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function patch<Data, Variables = unknown>(
    endpoint: string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function patch<Data, Variables = unknown>(
    template: (variables: Variables) => string,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables>

  function patch<Data, Variables = unknown>(
    source: ReactMutationSource<Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Outcome<Data>, Variables> {
    return mutator(http, 'PATCH', source, parameters)
  }

  return patch
}
