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

import { successify, unify } from './core/helpers'
import type {
  Endpoint,
  HttpOptions,
  Failed,
  Method,
  RequestOptions,
  Outcome,
  Success,
  SuccessStatusCode,
  ExtendedBase,
} from './core/models'
import { create } from './core/request'
import type { Http } from './core/request'

export type ReactQuerySource<Base extends string, Data = unknown> =
  | Endpoint<Base>
  | (() => Promise<Outcome<Data>>)

export type ReactQueryParameters<Data = unknown> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Data
  options?: RequestOptions<Data>
  extras?: Omit<
    UseQueryOptions<Success<Data>, Failed>,
    'queryKey' | 'queryFn' | 'enabled' | 'initialData'
  >
}

export type ReactQueryOutcome<Data> = {
  states: {
    status: QueryStatus
    success: boolean
    failed: boolean
    pending: boolean
    loading: boolean
    fetching: boolean
    refetching: boolean
    stale: boolean
  }
  responses: {
    success: Success<Data> | undefined
    failed: Failed | null
  }
  handlers: {
    refetch: () => void
  }
}

export type ReactQuery<Base extends string, Data> = (
  source: ReactQuerySource<Base, Data>,
  parameters: ReactQueryParameters<Data>,
) => ReactQueryOutcome<Data>

export type ReactInfiniteQueryVariables = {
  page: number
}

export type ReactInfiniteQuerySource<
  Base extends string,
  Data = unknown,
  Variables = ReactInfiniteQueryVariables,
> = Endpoint<Base> | ((variables: Variables) => Endpoint<Base> | Promise<Outcome<Data>>)

export type ReactInfiniteQueryParameters<
  Data = unknown,
  Source = Data,
  Variables = ReactInfiniteQueryVariables,
> = {
  key: unknown[]
  enabled?: boolean
  defaults?: Source
} & (Variables extends ReactInfiniteQueryVariables
  ? { variables?: Variables }
  : { variables: Variables })

export type ReactInfiniteQueryOutcome<Data> = {
  states: {
    status: QueryStatus
    success: boolean
    failed: boolean
    pending: boolean
    loading: boolean
    fetching: boolean
    paging: boolean
    more: boolean
    refetching: boolean
    stale: boolean
  }
  responses: {
    success: Success<Data>[]
    failed: Failed | null
  }
  handlers: {
    next: () => void
    refetch: () => void
  }
}

export type ReactInfiniteQuery<Base extends string, Data> = (
  source: ReactInfiniteQuerySource<Base, Data>,
  parameters: ReactInfiniteQueryParameters<Data>,
) => ReactInfiniteQueryOutcome<Data>

export type ReactMutationSource<Base extends string, Data = unknown, Variables = unknown> =
  | Endpoint<Base>
  | ((variables: Variables) => Endpoint<Base> | Promise<Outcome<Data>>)

export type ReactMutationInvalidate = {
  key: unknown[]
  mode?: InvalidateQueryFilters['type']
}

export type ReactMutationParameters<Data, Variables = void> = {
  key?: unknown[]
  success?: (success: Success<Data>, variables: Variables) => void
  failure?: (failed: Failed, variables: Variables) => void
  invalidates?: (ReactMutationInvalidate | unknown[])[]
  options?: RequestOptions<Data>
  extras?: Omit<
    UseMutationOptions<Success<Data>, Failed, Variables>,
    'mutationKey' | 'mutationFn' | 'onSuccess' | 'onError'
  >
}

export type ReactMutationOutcome<Data, Variables> = {
  states: {
    status: MutationStatus
    success: boolean
    failed: boolean
    pending: boolean
    idle: boolean
  }
  responses: {
    success: Success<Data> | undefined
    failed: Failed | null
  }
  handlers: {
    fire: (variables: Variables) => void
    execute: (variables: Variables) => Promise<Outcome<Data>>
    reset: () => void
  }
}

export type ReactMutation<Base extends string, Data, Variables = unknown> = (
  source: ReactMutationSource<Base, Data, Variables>,
  parameters: ReactMutationParameters<Data, Variables>,
) => ReactMutationOutcome<Data, Variables>

export const converter = {
  query: <Data>(result: UseQueryResult<Success<Data>, Failed>): ReactQueryOutcome<Data> => ({
    states: {
      status: result.status,
      success: result.isSuccess,
      failed: result.isError,
      pending: result.isPending,
      loading: result.isLoading,
      fetching: result.isFetching,
      refetching: result.isRefetching,
      stale: result.isStale,
    },
    responses: {
      success: result.data,
      failed: result.error,
    },
    handlers: {
      refetch: result.refetch,
    },
  }),
  infinite: <Data>(
    result: UseInfiniteQueryResult<InfiniteData<Success<Data>>, Failed>,
  ): ReactInfiniteQueryOutcome<Data> => ({
    states: {
      status: result.status,
      success: result.isSuccess,
      failed: result.isError,
      pending: result.isPending,
      loading: result.isLoading,
      fetching: result.isFetching,
      paging: result.isFetchingNextPage,
      more: result.hasNextPage || false,
      refetching: result.isRefetching,
      stale: result.isStale,
    },
    responses: {
      success: result.data?.pages ?? [],
      failed: result.error,
    },
    handlers: {
      next: () => result.hasNextPage && !result.isFetchingNextPage && result.fetchNextPage(),
      refetch: result.refetch,
    },
  }),
  mutation: <Data, Variables>(
    result: UseMutationResult<Success<Data>, Failed, Variables>,
  ): ReactMutationOutcome<Data, Variables> => ({
    states: {
      status: result.status,
      success: result.isSuccess,
      failed: result.isError,
      pending: result.isPending,
      idle: result.isIdle,
    },
    responses: {
      success: result.data,
      failed: result.error,
    },
    handlers: {
      fire: result.mutate,
      execute: async (variables: Variables): Promise<Outcome<Data>> => {
        try {
          return await result.mutateAsync(variables)
        } catch (thrown) {
          return thrown as Failed
        }
      },
      reset: result.reset,
    },
  }),
}

type Methods<Base extends string> = {
  get: {
    <Data>(
      action: () => Promise<Outcome<Data>>,
      parameters: ReactQueryParameters<Data>,
    ): ReactQueryOutcome<Data>
    <Data>(
      endpoint: Endpoint<Base>,
      parameters: ReactQueryParameters<Data>,
    ): ReactQueryOutcome<Data>
  }
  infinite: {
    <Data, Variables = ReactInfiniteQueryVariables>(
      action: (variables: Variables) => Promise<Outcome<Data>>,
      parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
        next: (parameters: {
          last: Success<Data>
          pages: Success<Data>[]
          variables: Variables
        }) => Variables | undefined
      },
    ): ReactInfiniteQueryOutcome<Data>
    <Data, Source, Variables = ReactInfiniteQueryVariables>(
      action: (variables: Variables) => Promise<Outcome<Source>>,
      parameters: ReactInfiniteQueryParameters<Data, Source, Variables> & {
        next: (parameters: {
          last: Success<Data>
          pages: Success<Data>[]
          variables: Variables
        }) => Variables | undefined
        transform: (source: Source, variables: Variables) => Data
      },
    ): ReactInfiniteQueryOutcome<Data>
    <Data, Variables = ReactInfiniteQueryVariables>(
      endpoint: Endpoint<Base>,
      parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
        next: (parameters: {
          last: Success<Data>
          pages: Success<Data>[]
          variables: Variables
        }) => Variables | undefined
      },
    ): ReactInfiniteQueryOutcome<Data>
    <Data, Variables = ReactInfiniteQueryVariables>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
        next: (parameters: {
          last: Success<Data>
          pages: Success<Data>[]
          variables: Variables
        }) => Variables | undefined
      },
    ): ReactInfiniteQueryOutcome<Data>
    <Data, Source, Variables = ReactInfiniteQueryVariables>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactInfiniteQueryParameters<Data, Source, Variables> & {
        next: (parameters: {
          last: Success<Data>
          pages: Success<Data>[]
          variables: Variables
        }) => Variables | undefined
        transform: (source: Source, variables: Variables) => Data
      },
    ): ReactInfiniteQueryOutcome<Data>
  }
  post: {
    <Data, Variables = void>(
      action: (variables: Variables) => Promise<Outcome<Data>>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      endpoint: Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
  }
  put: {
    <Data, Variables = void>(
      action: (variables: Variables) => Promise<Outcome<Data>>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      endpoint: Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
  }
  delete: {
    <Data, Variables = void>(
      action: (variables: Variables) => Promise<Outcome<Data>>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      endpoint: Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
  }
  patch: {
    <Data, Variables = void>(
      action: (variables: Variables) => Promise<Outcome<Data>>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      endpoint: Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
    <Data, Variables = unknown>(
      template: (variables: Variables) => Endpoint<Base>,
      parameters: ReactMutationParameters<Data, Variables>,
    ): ReactMutationOutcome<Data, Variables>
  }
}

export type Builder<Base extends string> = Methods<Base> & {
  extend: <const Extended extends Partial<HttpOptions>>(
    extended: Extended,
  ) => Builder<ExtendedBase<Base, Extended>>
}

const builder = <Base extends string>(http: Http<Base>): Builder<Base> => ({
  get: getter(http),
  infinite: infiniter(http),
  post: poster(http),
  put: updater(http),
  delete: remover(http),
  patch: patcher(http),
  extend: <const Extended extends Partial<HttpOptions>>(extended: Extended) =>
    builder(http.extend(extended)),
})

export const react = <const Options extends Partial<HttpOptions>>(options?: Options) =>
  builder(create(options))

const execute = async <Base extends string, Data>(
  http: Http<Base>,
  method: Method,
  endpoint: Endpoint<Base>,
  body?: unknown,
  options?: RequestOptions<Data>,
): Promise<Outcome<Data>> => {
  const handlers: Record<Method, () => Promise<Outcome<Data>>> = {
    GET: () => http.get<Data>(endpoint, options),
    POST: () => http.post<Data>(endpoint, body, options),
    PUT: () => http.put<Data>(endpoint, body, options),
    PATCH: () => http.patch<Data>(endpoint, body, options),
    DELETE: () => http.delete<Data>(endpoint, options),
  }

  return handlers[method]()
}

const getter = <Base extends string>(http: Http<Base>) => {
  function get<Data>(
    action: () => Promise<Outcome<Data>>,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data>

  function get<Data>(
    endpoint: Endpoint<Base>,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data>

  function get<Data>(
    source: ReactQuerySource<Base, Data>,
    parameters: ReactQueryParameters<Data>,
  ): ReactQueryOutcome<Data> {
    const { key, enabled, defaults, options, extras } = parameters

    const response = useQuery<Success<Data>, Failed>({
      queryKey: key,
      queryFn: async () => {
        const response = await unify<Data, []>({
          source,
          executor: (endpoint) => execute<Base, Data>(http, 'GET', endpoint, undefined, options),
          verify: options?.verify,
        })

        if (!response.success) {
          throw response
        }

        return response
      },
      enabled,
      initialData: defaults ? successify(defaults) : undefined,
      ...extras,
    })

    return converter.query(response)
  }

  return get
}

const infiniter = <Base extends string>(http: Http<Base>) => {
  function infinite<Data, Variables = ReactInfiniteQueryVariables>(
    action: (variables: Variables) => Promise<Outcome<Data>>,
    parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source, Variables = ReactInfiniteQueryVariables>(
    action: (variables: Variables) => Promise<Outcome<Source>>,
    parameters: ReactInfiniteQueryParameters<Data, Source, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
      transform: (source: Source, variables: Variables) => Data
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Variables = ReactInfiniteQueryVariables>(
    endpoint: Endpoint<Base>,
    parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Variables = ReactInfiniteQueryVariables>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactInfiniteQueryParameters<Data, Data, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source, Variables = ReactInfiniteQueryVariables>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactInfiniteQueryParameters<Data, Source, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
      transform: (source: Source, variables: Variables) => Data
    },
  ): ReactInfiniteQueryOutcome<Data>

  function infinite<Data, Source = Data, Variables = ReactInfiniteQueryVariables>(
    source: ReactInfiniteQuerySource<Base, Source, Variables>,
    parameters: ReactInfiniteQueryParameters<Data, Source, Variables> & {
      next: (parameters: {
        last: Success<Data>
        pages: Success<Data>[]
        variables: Variables
      }) => Variables | undefined
      transform?: (source: Source, variables: Variables) => Data
    },
  ): ReactInfiniteQueryOutcome<Data> {
    const { key, enabled, defaults, variables: _variables, transform, next } = parameters
    const variables = (_variables ?? { page: 0 }) as Variables

    const response = useInfiniteQuery<
      Success<Data>,
      Failed,
      InfiniteData<Success<Data>, Variables>,
      unknown[],
      Variables
    >({
      queryKey: key,
      queryFn: async (context) => {
        const page = context.pageParam as Variables

        const response = await unify<Source, [Variables]>({
          source,
          parameters: [page],
          executor: (endpoint) =>
            execute<Base, Source>(http, 'GET', endpoint, undefined, undefined),
        })

        if (!response.success) {
          throw response
        }

        return transform
          ? successify(transform(response.data, page), response.status as SuccessStatusCode)
          : (response as unknown as Success<Data>)
      },
      getNextPageParam: (last, pages, variables) => next({ last, pages, variables }),
      initialPageParam: variables,
      initialData:
        defaults && transform
          ? {
              pages: [successify(transform(defaults, variables))],
              pageParams: [variables],
            }
          : defaults
            ? {
                pages: [successify(defaults as unknown as Data)],
                pageParams: [variables],
              }
            : undefined,
      enabled,
    })

    return converter.infinite(response)
  }

  return infinite
}

const mutator = <Base extends string, Data, Variables>(
  http: Http<Base>,
  method: Exclude<Method, 'GET'>,
  source: ReactMutationSource<Base, Data, Variables>,
  parameters: ReactMutationParameters<Data, Variables>,
): ReactMutationOutcome<Data, Variables> => {
  const { key, success, failure, invalidates, options, extras } = parameters
  const cache = useQueryClient()

  const response = useMutation<Success<Data>, Failed, Variables>({
    mutationKey: key,
    mutationFn: async (variables: Variables) => {
      const response = await unify<Data, [Variables]>({
        source,
        parameters: [variables],
        executor: (endpoint) => execute<Base, Data>(http, method, endpoint, variables, options),
        verify: options?.verify,
      })

      if (!response.success) {
        throw response
      }

      return response
    },
    onSuccess: (data, variables) => {
      if (invalidates) {
        for (const filter of invalidates) {
          if (Array.isArray(filter)) {
            cache.invalidateQueries({ queryKey: filter })
          } else {
            cache.invalidateQueries({ queryKey: filter.key, type: filter.mode })
          }
        }
      }

      success?.(data, variables)
    },
    onError: (failed, variables) => failure?.(failed, variables),
    ...extras,
  })

  return converter.mutation(response)
}

const poster = <Base extends string>(http: Http<Base>) => {
  function post<Data, Variables = void>(
    action: (variables: Variables) => Promise<Outcome<Data>>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function post<Data, Variables = unknown>(
    endpoint: Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function post<Data, Variables = unknown>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function post<Data, Variables = unknown>(
    source: ReactMutationSource<Base, Data, Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables> {
    return mutator(http, 'POST', source, parameters)
  }

  return post
}

const updater = <Base extends string>(http: Http<Base>) => {
  function put<Data, Variables = void>(
    action: (variables: Variables) => Promise<Outcome<Data>>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function put<Data, Variables = unknown>(
    endpoint: Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function put<Data, Variables = unknown>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function put<Data, Variables = unknown>(
    source: ReactMutationSource<Base, Data, Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables> {
    return mutator(http, 'PUT', source, parameters)
  }

  return put
}

const remover = <Base extends string>(http: Http<Base>) => {
  function remove<Data, Variables = void>(
    action: (variables: Variables) => Promise<Outcome<Data>>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function remove<Data, Variables = unknown>(
    endpoint: Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function remove<Data, Variables = unknown>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function remove<Data, Variables = unknown>(
    source: ReactMutationSource<Base, Data, Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables> {
    return mutator(http, 'DELETE', source, parameters)
  }

  return remove
}

const patcher = <Base extends string>(http: Http<Base>) => {
  function patch<Data, Variables = void>(
    action: (variables: Variables) => Promise<Outcome<Data>>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function patch<Data, Variables = unknown>(
    endpoint: Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function patch<Data, Variables = unknown>(
    template: (variables: Variables) => Endpoint<Base>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables>

  function patch<Data, Variables = unknown>(
    source: ReactMutationSource<Base, Data, Variables>,
    parameters: ReactMutationParameters<Data, Variables>,
  ): ReactMutationOutcome<Data, Variables> {
    return mutator(http, 'PATCH', source, parameters)
  }

  return patch
}
