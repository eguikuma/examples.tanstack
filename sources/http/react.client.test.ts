import { createElement } from 'react'
import type { ReactNode } from 'react'

import { renderHook, waitFor } from '@testing-library/react'
import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi } from 'vitest'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { react, handler, converter } from './react.client'

describe('react.client.ts', () => {
  describe('react', () => {
    test('既定のオプションで通信クライアントを作成すること', () => {
      const http = react()

      expect(http).toBeDefined()
      expect(http.get).toBeDefined()
      expect(http.infinite).toBeDefined()
      expect(http.post).toBeDefined()
      expect(http.put).toBeDefined()
      expect(http.delete).toBeDefined()
      expect(http.patch).toBeDefined()
    })

    test('カスタムオプションで通信クライアントを作成すること', () => {
      const http = react({
        base: 'https://api.example.com',
        timeout: 5000,
      })

      expect(http).toBeDefined()
      expect(http.get).toBeDefined()
      expect(http.infinite).toBeDefined()
      expect(http.post).toBeDefined()
      expect(http.put).toBeDefined()
      expect(http.delete).toBeDefined()
      expect(http.patch).toBeDefined()
    })
  })

  describe('handler', () => {
    test('成功時、successコールバックを呼ぶこと', () => {
      const success = vi.fn()
      const failure = vi.fn()

      type Response = {
        success: true
        status: number
        data: { id: number; name: string }
      }
      type Variables = { id: number }

      const response: Response = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1, name: 'Test' },
      }
      const variables: Variables = { id: 1 }

      const handle = handler(success, failure)
      handle(response, variables)

      expect(success).toHaveBeenCalledWith(response, variables)
      expect(failure).not.toHaveBeenCalled()
    })

    test('失敗時、failureコールバックを呼ぶこと', () => {
      const success = vi.fn()
      const failure = vi.fn()

      type Response = {
        success: false
        status: number
        message: string
      }
      type Variables = { id: number }

      const response: Response = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Validation failed',
      }
      const variables: Variables = { id: 1 }

      const handle = handler(success, failure)
      handle(response, variables)

      expect(success).not.toHaveBeenCalled()
      expect(failure).toHaveBeenCalledWith(response, variables)
    })

    test('コールバックが指定されていなくても正常に動作すること', () => {
      type Response = {
        success: true
        status: number
        data: { id: number }
      }
      type Variables = { id: number }

      const response: Response = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      }
      const variables: Variables = { id: 1 }

      const handle = handler()

      expect(() => handle(response, variables)).not.toThrow()
    })

    test('失敗時、コールバックが指定されていなくても正常に動作すること', () => {
      type Response = {
        success: false
        status: number
        message: string
      }
      type Variables = { id: number }

      const response: Response = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Error',
      }
      const variables: Variables = { id: 1 }

      const handle = handler()

      expect(() => handle(response, variables)).not.toThrow()
    })

    test('変数がnullの場合、成功コールバックに渡されること', () => {
      const success = vi.fn()

      type Response = {
        success: true
        status: number
        data: { id: number }
      }

      const response: Response = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      }

      const handle = handler(success)
      handle(response, null as never)

      expect(success).toHaveBeenCalledWith(response, null)
    })

    test('変数がundefinedの場合、成功コールバックに渡されること', () => {
      const success = vi.fn()

      type Response = {
        success: true
        status: number
        data: { id: number }
      }

      const response: Response = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      }

      const handle = handler(success)
      handle(response, undefined as never)

      expect(success).toHaveBeenCalledWith(response, undefined)
    })

    test('変数がnullの場合、失敗コールバックに渡されること', () => {
      const failure = vi.fn()

      type Response = {
        success: false
        status: number
        message: string
      }

      const response: Response = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Error',
      }

      const handle = handler(undefined, failure)
      handle(response, null as never)

      expect(failure).toHaveBeenCalledWith(response, null)
    })

    test('変数がundefinedの場合、失敗コールバックに渡されること', () => {
      const failure = vi.fn()

      type Response = {
        success: false
        status: number
        message: string
      }

      const response: Response = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Error',
      }

      const handle = handler(undefined, failure)
      handle(response, undefined as never)

      expect(failure).toHaveBeenCalledWith(response, undefined)
    })

    test('成功コールバックが例外を投げた場合、例外が伝播すること', () => {
      const success = vi.fn(() => {
        throw new Error('Callback error')
      })

      type Response = {
        success: true
        status: number
        data: { id: number }
      }
      type Variables = { id: number }

      const response: Response = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      }
      const variables: Variables = { id: 1 }

      const handle = handler(success)

      expect(() => handle(response, variables)).toThrow('Callback error')
    })

    test('失敗コールバックが例外を投げた場合、例外が伝播すること', () => {
      const failure = vi.fn(() => {
        throw new Error('Callback error')
      })

      type Response = {
        success: false
        status: number
        message: string
      }
      type Variables = { id: number }

      const response: Response = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Error',
      }
      const variables: Variables = { id: 1 }

      const handle = handler(undefined, failure)

      expect(() => handle(response, variables)).toThrow('Callback error')
    })
  })

  describe('converter', () => {
    test('変換オブジェクトが定義されていること', () => {
      expect(converter).toBeDefined()
    })

    test('query変換関数が定義されていること', () => {
      expect(converter.query).toBeDefined()
    })

    test('infinite変換関数が定義されていること', () => {
      expect(converter.infinite).toBeDefined()
    })

    test('mutation変換関数が定義されていること', () => {
      expect(converter.mutation).toBeDefined()
    })

    describe('query', () => {
      test('UseQueryResultの全プロパティを正しく変換すること', () => {
        const refetch = vi.fn()
        const original = {
          isPending: true,
          isSuccess: false,
          isError: false,
          isFetching: true,
          isLoading: true,
          isRefetching: false,
          isStale: false,
          data: { id: 1, name: 'Test' },
          error: null,
          status: 'pending' as const,
          refetch: refetch,
        }

        const response = converter.query(original as never)

        expect(response.pending).toBe(true)
        expect(response.success).toBe(false)
        expect(response.error).toBe(false)
        expect(response.fetching).toBe(true)
        expect(response.loading).toBe(true)
        expect(response.refetching).toBe(false)
        expect(response.stale).toBe(false)
        expect(response.data).toEqual({ id: 1, name: 'Test' })
        expect(response.failure).toBe(null)
        expect(response.status).toBe('pending')
        expect(response.refetch).toBe(refetch)
      })

      test('dataがundefinedの場合、undefinedを返すこと', () => {
        const original = {
          isPending: true,
          isSuccess: false,
          isError: false,
          isFetching: false,
          isLoading: true,
          isRefetching: false,
          isStale: false,
          data: undefined,
          error: null,
          status: 'pending' as const,
          refetch: vi.fn(),
        }

        const response = converter.query(original as never)

        expect(response.data).toBeUndefined()
      })

      test('errorがnullの場合、failureがnullであること', () => {
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isStale: false,
          data: { id: 1 },
          error: null,
          status: 'success' as const,
          refetch: vi.fn(),
        }

        const response = converter.query(original as never)

        expect(response.failure).toBe(null)
      })

      test('refetch関数を呼び出せること', () => {
        const refetch = vi.fn()
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isStale: false,
          data: { id: 1 },
          error: null,
          status: 'success' as const,
          refetch: refetch,
        }

        const response = converter.query(original as never)
        response.refetch()

        expect(refetch).toHaveBeenCalled()
      })
    })

    describe('infinite', () => {
      test('UseInfiniteQueryResultの全プロパティを正しく変換すること', () => {
        const refetch = vi.fn()
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isFetchingNextPage: false,
          hasNextPage: true,
          isStale: false,
          data: { pages: [{ id: 1 }, { id: 2 }], pageParams: [0, 1] },
          error: null,
          status: 'success' as const,
          fetchNextPage: vi.fn(),
          refetch: refetch,
        }

        const response = converter.infinite(original as never)

        expect(response.pending).toBe(false)
        expect(response.success).toBe(true)
        expect(response.error).toBe(false)
        expect(response.fetching).toBe(false)
        expect(response.loading).toBe(false)
        expect(response.refetching).toBe(false)
        expect(response.paging).toBe(false)
        expect(response.more).toBe(true)
        expect(response.stale).toBe(false)
        expect(response.pages).toEqual([{ id: 1 }, { id: 2 }])
        expect(response.failure).toBe(null)
        expect(response.status).toBe('success')
        expect(response.refetch).toBe(refetch)
      })

      test('data.pagesがundefinedの場合、空配列を返すこと', () => {
        const original = {
          isPending: true,
          isSuccess: false,
          isError: false,
          isFetching: true,
          isLoading: true,
          isRefetching: false,
          isFetchingNextPage: false,
          hasNextPage: false,
          isStale: false,
          data: undefined,
          error: null,
          status: 'pending' as const,
          fetchNextPage: vi.fn(),
          refetch: vi.fn(),
        }

        const response = converter.infinite(original as never)

        expect(response.pages).toEqual([])
      })

      test('hasNextPageがfalseの場合、moreがfalseであること', () => {
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isFetchingNextPage: false,
          hasNextPage: false,
          isStale: false,
          data: { pages: [{ id: 1 }], pageParams: [0] },
          error: null,
          status: 'success' as const,
          fetchNextPage: vi.fn(),
          refetch: vi.fn(),
        }

        const response = converter.infinite(original as never)

        expect(response.more).toBe(false)
      })

      test('hasNextPageがundefinedの場合、moreがfalseであること', () => {
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isFetchingNextPage: false,
          hasNextPage: undefined,
          isStale: false,
          data: { pages: [{ id: 1 }], pageParams: [0] },
          error: null,
          status: 'success' as const,
          fetchNextPage: vi.fn(),
          refetch: vi.fn(),
        }

        const response = converter.infinite(original as never)

        expect(response.more).toBe(false)
      })

      test('hasNextPageがfalseの場合、next関数を呼んでも何もしないこと', () => {
        const next = vi.fn()
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: false,
          isLoading: false,
          isRefetching: false,
          isFetchingNextPage: false,
          hasNextPage: false,
          isStale: false,
          data: { pages: [{ id: 1 }], pageParams: [0] },
          error: null,
          status: 'success' as const,
          fetchNextPage: next,
          refetch: vi.fn(),
        }

        const response = converter.infinite(original as never)
        response.next()

        expect(next).not.toHaveBeenCalled()
      })

      test('isFetchingNextPageがtrueの場合、next関数を呼んでも何もしないこと', () => {
        const next = vi.fn()
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isFetching: true,
          isLoading: false,
          isRefetching: false,
          isFetchingNextPage: true,
          hasNextPage: true,
          isStale: false,
          data: { pages: [{ id: 1 }], pageParams: [0] },
          error: null,
          status: 'success' as const,
          fetchNextPage: next,
          refetch: vi.fn(),
        }

        const response = converter.infinite(original as never)
        response.next()

        expect(next).not.toHaveBeenCalled()
      })
    })

    describe('mutation', () => {
      test('UseMutationResultの全プロパティを正しく変換すること', () => {
        const mutate = vi.fn()
        const execute = vi.fn()
        const reset = vi.fn()
        const original = {
          isPending: true,
          isSuccess: false,
          isError: false,
          isIdle: false,
          error: null,
          status: 'pending' as const,
          mutate: mutate,
          mutateAsync: execute,
          reset: reset,
        }

        const response = converter.mutation(original as never)

        expect(response.pending).toBe(true)
        expect(response.success).toBe(false)
        expect(response.error).toBe(false)
        expect(response.idle).toBe(false)
        expect(response.failure).toBe(null)
        expect(response.status).toBe('pending')
        expect(response.mutate).toBe(mutate)
        expect(response.execute).toBe(execute)
        expect(response.reset).toBe(reset)
      })

      test('errorがnullの場合、failureがnullであること', () => {
        const original = {
          isPending: false,
          isSuccess: true,
          isError: false,
          isIdle: false,
          error: null,
          status: 'success' as const,
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          reset: vi.fn(),
        }

        const response = converter.mutation(original as never)

        expect(response.failure).toBe(null)
      })
    })
  })

  describe('get', () => {
    test('サーバーアクションで成功レスポンスを取得すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: { id: 1, name: 'Test' },
        }
      }

      const { result } = renderHook(() => http.get(action, { key: ['test'] }), { wrapper })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.data).toEqual({ id: 1, name: 'Test' })
      expect(result.current.error).toBe(false)
    })

    test('エンドポイント文字列で成功レスポンスを取得すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 2, name: 'User' }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.get('/api/user', { key: ['user'] }), { wrapper })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.data).toEqual({ id: 2, name: 'User' })
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('サーバーアクションがResponseをスローした場合、エラーを投げること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        throw new Response(null, { status: StatusCodes.INTERNAL_SERVER_ERROR })
      }

      const { result } = renderHook(() => http.get(action, { key: ['error1'] }), { wrapper })

      await waitFor(() => expect(result.current.error).toBe(true))
      expect(result.current.success).toBe(false)
      expect(result.current.data).toBeUndefined()
    })

    test('サーバーアクションがErrorをスローした場合、エラーを投げること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        throw new Error('Test error')
      }

      const { result } = renderHook(() => http.get(action, { key: ['error2'] }), { wrapper })

      await waitFor(() => expect(result.current.error).toBe(true))
      expect(result.current.success).toBe(false)
      expect(result.current.data).toBeUndefined()
    })

    test('サーバーアクションがその他をスローした場合、エラーを投げること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        throw 'string error'
      }

      const { result } = renderHook(() => http.get(action, { key: ['error3'] }), { wrapper })

      await waitFor(() => expect(result.current.error).toBe(true))
      expect(result.current.success).toBe(false)
      expect(result.current.data).toBeUndefined()
    })

    test('失敗レスポンスの場合、エラーを投げること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return {
          success: false as const,
          status: StatusCodes.BAD_REQUEST,
          message: 'Bad request',
        }
      }

      const { result } = renderHook(() => http.get(action, { key: ['error4'] }), { wrapper })

      await waitFor(() => expect(result.current.error).toBe(true))
      expect(result.current.success).toBe(false)
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('infinite', () => {
    test('サーバーアクションで成功レスポンスを取得すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async (page: number) => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: { page, items: [`item${page}`] },
        }
      }

      const { result } = renderHook(
        () =>
          http.infinite(action, {
            key: ['infinite'],
            next: (last) => (last.page < 2 ? last.page + 1 : undefined),
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.pages).toHaveLength(1)
      expect(result.current.pages[0]).toEqual({ page: 0, items: ['item0'] })
      expect(result.current.error).toBe(false)
    })

    test('エンドポイント関数で成功レスポンスを取得すること', async () => {
      const original = globalThis.fetch
      let page = 0
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ page: page++, items: [`item${page - 1}`] }), {
            status: StatusCodes.OK,
          }),
        ),
      )

      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const endpoint = (page: number) => `/api/items?page=${page}`

      const { result } = renderHook(
        () =>
          http.infinite(endpoint, {
            key: ['infinite-endpoint'],
            next: (last: { page: number; items: string[] }) =>
              last.page < 2 ? last.page + 1 : undefined,
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.pages).toHaveLength(1)
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('エラーハンドリングが動作すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        throw new Error('Infinite error')
      }

      const { result } = renderHook(
        () =>
          http.infinite(action, {
            key: ['infinite-error'],
            next: () => undefined,
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.error).toBe(true))
      expect(result.current.success).toBe(false)
      expect(result.current.pages).toEqual([])
    })
  })

  describe('post', () => {
    test('サーバーアクションで成功レスポンスを取得すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return new Response(
          JSON.stringify({
            success: true,
            status: StatusCodes.CREATED,
            data: { id: 1, name: 'Created' },
          }),
          {
            status: StatusCodes.CREATED,
          },
        )
      }

      const { result } = renderHook(() => http.post(action, { key: ['post'] }), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)
      expect(result.current.pending).toBe(false)
    })

    test('エンドポイント文字列で成功レスポンスを取得すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 2, name: 'Posted' }), {
          status: StatusCodes.CREATED,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.post('/api/create', { key: ['post2'] }), { wrapper })

      result.current.mutate({ name: 'Test' })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('無効化が動作すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 3 }), {
          status: StatusCodes.CREATED,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const invalidate = vi.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(
        () => http.post('/api/create', { key: ['post3'], invalidates: [['users'], ['posts']] }),
        { wrapper },
      )

      result.current.mutate({})

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['posts'] })

      globalThis.fetch = original
    })
  })

  describe('put', () => {
    test('サーバーアクションでデータを更新すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return new Response(
          JSON.stringify({
            success: true,
            status: StatusCodes.OK,
            data: { id: 1, name: 'Updated' },
          }),
          {
            status: StatusCodes.OK,
          },
        )
      }

      const { result } = renderHook(() => http.put(action, { key: ['put2'] }), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)
      expect(result.current.pending).toBe(false)
    })

    test('エンドポイント文字列でデータを更新すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, updated: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.put('/api/update', { key: ['put'] }), { wrapper })

      result.current.mutate({ id: 1 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('更新成功時にキャッシュを無効化すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, updated: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const invalidate = vi.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(
        () => http.put('/api/update', { key: ['put3'], invalidates: [['items'], ['users']] }),
        { wrapper },
      )

      result.current.mutate({ id: 1 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['items'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] })

      globalThis.fetch = original
    })

    test('更新失敗時に失敗結果を返すこと', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.put('/api/update', { key: ['put4'] }), { wrapper })

      result.current.mutate({ id: 999 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })
  })

  describe('patch', () => {
    test('エンドポイント文字列でデータを部分更新すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, patched: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.patch('/api/patch', { key: ['patch'] }), { wrapper })

      result.current.mutate({ field: 'value' })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('サーバーアクションでデータを部分更新すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return new Response(
          JSON.stringify({
            success: true,
            status: StatusCodes.OK,
            data: { id: 1, field: 'Patched' },
          }),
          {
            status: StatusCodes.OK,
          },
        )
      }

      const { result } = renderHook(() => http.patch(action, { key: ['patch2'] }), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)
      expect(result.current.pending).toBe(false)
    })

    test('部分更新成功時にキャッシュを無効化すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, patched: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const invalidate = vi.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(
        () => http.patch('/api/patch', { key: ['patch3'], invalidates: [['items'], ['cache']] }),
        { wrapper },
      )

      result.current.mutate({ field: 'value' })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['items'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['cache'] })

      globalThis.fetch = original
    })

    test('部分更新失敗時に失敗結果を返すこと', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Validation error' }), {
          status: StatusCodes.BAD_REQUEST,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.patch('/api/patch', { key: ['patch4'] }), {
        wrapper,
      })

      result.current.mutate({ field: '' })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })
  })

  describe('delete', () => {
    test('エンドポイント文字列でデータを削除すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ deleted: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.delete('/api/delete', { key: ['delete'] }), {
        wrapper,
      })

      result.current.mutate({ id: 1 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })

    test('サーバーアクションでデータを削除すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const action = async () => {
        return new Response(
          JSON.stringify({
            success: true,
            status: StatusCodes.OK,
            data: { id: 1, deleted: true },
          }),
          {
            status: StatusCodes.OK,
          },
        )
      }

      const { result } = renderHook(() => http.delete(action, { key: ['delete2'] }), { wrapper })

      result.current.mutate()

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)
      expect(result.current.pending).toBe(false)
    })

    test('削除成功時にキャッシュを無効化すること', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ deleted: true }), {
          status: StatusCodes.OK,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()
      const invalidate = vi.spyOn(client, 'invalidateQueries')

      const { result } = renderHook(
        () => http.delete('/api/delete', { key: ['delete3'], invalidates: [['items'], ['list']] }),
        { wrapper },
      )

      result.current.mutate({ id: 1 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['items'] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['list'] })

      globalThis.fetch = original
    })

    test('削除失敗時に失敗結果を返すこと', async () => {
      const original = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const client = new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const http = react()

      const { result } = renderHook(() => http.delete('/api/delete', { key: ['delete4'] }), {
        wrapper,
      })

      result.current.mutate({ id: 999 })

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.error).toBe(false)

      globalThis.fetch = original
    })
  })
})
