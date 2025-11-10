import { createElement } from 'react'
import type { ReactNode } from 'react'

import { renderHook, waitFor } from '@testing-library/react'
import { StatusCodes } from 'http-status-codes'
import { describe, test, expect } from 'vitest'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { Feed, Entry, PagedFeed } from './core/models'
import { react } from './react.client'

describe('react.client.ts', () => {
  describe('react', () => {
    test('既定のオプションで配信データクライアントを作成すること', () => {
      const rss = react()

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })

    test('fetchメソッドを定義すること', () => {
      const rss = react()

      expect(typeof rss.get).toBe('function')
      expect(typeof rss.infinite).toBe('function')
    })

    test('異なるオプションで複数のクライアントを作成できること', () => {
      const rss1 = react()
      const rss2 = react({ timeout: 5000 })

      expect(rss1).toBeDefined()
      expect(rss2).toBeDefined()
      expect(rss1).not.toBe(rss2)
      expect(rss1.get).not.toBe(rss2.get)
      expect(rss1.infinite).not.toBe(rss2.infinite)
    })

    test('カスタムタイムアウトでクライアントを作成できること', () => {
      const rss = react({ timeout: 15000 })

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })

    test('カスタムヘッダーでクライアントを作成できること', () => {
      const rss = react({
        headers: {
          'User-Agent': 'MyApp/1.0',
        },
      })

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })
  })

  describe('infinite', () => {
    test('指定されたサイズ分のエントリをスライスして返すこと', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const entries: Entry[] = Array.from({ length: 10 }, (_, index) => ({
        identifier: `entry-${index}`,
        title: `Entry ${index}`,
        description: `Description ${index}`,
      }))

      const feed: Feed = {
        title: 'Test Feed',
        description: 'Test Description',
        entries,
      }

      const rss = react()
      const action = async () => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: feed,
        }
      }

      const { result } = renderHook(
        () =>
          rss.infinite(action, {
            key: ['rss-infinite'],
            size: 3,
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.success).toBe(true))
      expect(result.current.pages).toHaveLength(1)

      const page = result.current.pages[0] as PagedFeed
      expect(page.entries).toHaveLength(3)
      expect((page.entries[0] as Entry).identifier).toBe('entry-0')
      expect((page.entries[1] as Entry).identifier).toBe('entry-1')
      expect((page.entries[2] as Entry).identifier).toBe('entry-2')
    })

    test('PagedFeed型を正しく生成すること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const entries: Entry[] = Array.from({ length: 10 }, (_, index) => ({
        identifier: `entry-${index}`,
        title: `Entry ${index}`,
      }))

      const feed: Feed = {
        title: 'Test Feed',
        entries,
      }

      const rss = react()
      const action = async () => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: feed,
        }
      }

      const { result } = renderHook(
        () =>
          rss.infinite(action, {
            key: ['rss-paged-feed'],
            size: 3,
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.success).toBe(true))

      const page = result.current.pages[0] as PagedFeed
      expect(page.entries).toBeDefined()
      expect(page.total).toBe(10)
      expect(page.next).toBe(1)
    })

    test('最後のページの場合、nextがundefinedになること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const entries: Entry[] = Array.from({ length: 5 }, (_, index) => ({
        identifier: `entry-${index}`,
        title: `Entry ${index}`,
      }))

      const feed: Feed = {
        title: 'Test Feed',
        entries,
      }

      const rss = react()
      const action = async () => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: feed,
        }
      }

      const { result } = renderHook(
        () =>
          rss.infinite(action, {
            key: ['rss-next-calc'],
            size: 3,
          }),
        { wrapper },
      )

      await waitFor(() => expect(result.current.success).toBe(true))

      const page1 = result.current.pages[0] as PagedFeed
      expect(page1.next).toBe(1)

      result.current.next()
      await waitFor(() => expect(result.current.pages).toHaveLength(2))

      const page2 = result.current.pages[1] as PagedFeed
      expect(page2.entries).toHaveLength(2)
      expect(page2.next).toBeUndefined()
    })

    test('defaultsを指定した場合、PagedFeed形式に変換されること', async () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children)

      const entries: Entry[] = Array.from({ length: 10 }, (_, index) => ({
        identifier: `entry-${index}`,
        title: `Entry ${index}`,
      }))

      const defaults: Feed = {
        title: 'Default Feed',
        entries,
      }

      const rss = react()
      const action = async () => {
        return {
          success: true as const,
          status: StatusCodes.OK,
          data: defaults,
        }
      }

      const { result } = renderHook(
        () =>
          rss.infinite(action, {
            key: ['rss-defaults'],
            size: 4,
            defaults,
          }),
        { wrapper },
      )

      expect(result.current.pages).toHaveLength(1)

      const page = result.current.pages[0] as PagedFeed
      expect(page.entries).toHaveLength(4)
      expect((page.entries[0] as Entry).identifier).toBe('entry-0')
      expect((page.entries[3] as Entry).identifier).toBe('entry-3')
      expect(page.total).toBe(10)
      expect(page.next).toBe(1)
    })
  })
})
