import { describe, test, expect } from 'vitest'

import { injector } from './injector'
import type { RequestContext } from '../models'

describe('injector.ts', () => {
  describe('headers', () => {
    test('同期的な場合、ヘッダーを追加すること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer sync-token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: 'Bearer sync-token',
      })
    })

    test('非同期的な場合、ヘッダーを追加すること', async () => {
      const interceptor = injector({
        headers: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return {
            Authorization: 'Bearer async-token',
          }
        },
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: 'Bearer async-token',
      })
    })

    test('既存のヘッダーを保持しながら新しいヘッダーを追加すること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      })
    })

    test('複数のヘッダーを一度に追加できること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
          'X-API-Key': 'key456',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: 'Bearer token',
        'X-API-Key': 'key456',
      })
    })

    test('同じキーのヘッダーの場合、上書きされること', async () => {
      const interceptor = injector({
        headers: () => ({
          'Content-Type': 'text/plain',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'Content-Type': 'text/plain',
      })
    })

    test('空のヘッダーを返す場合、既存のヘッダーのみ保持すること', async () => {
      const interceptor = injector({
        headers: () => ({}),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'Content-Type': 'application/json',
      })
    })

    test('ヘッダー関数がエラーをスローした場合、例外が伝播すること', async () => {
      const interceptor = injector({
        headers: () => {
          throw new Error('Token expired')
        },
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      await expect(interceptor(context)).rejects.toThrow('Token expired')
    })

    test('ヘッダー関数が拒否を返す場合、例外が伝播すること', async () => {
      const interceptor = injector({
        headers: async () => {
          throw new Error('Auth failed')
        },
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      await expect(interceptor(context)).rejects.toThrow('Auth failed')
    })

    test('既存のヘッダーが未定義の場合、ヘッダーを追加すること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: 'Bearer token',
      })
    })

    test('空文字列の値の場合、そのまま設定されること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: '',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: '',
      })
    })

    test('非常に長い値の場合、そのまま設定されること', async () => {
      const long = `Bearer ${'a'.repeat(2000)}`
      const interceptor = injector({
        headers: () => ({
          Authorization: long,
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        Authorization: long,
      })
    })

    test('特殊文字を含む名前の場合、そのまま設定されること', async () => {
      const interceptor = injector({
        headers: () => ({
          'X-Custom-Header-123': 'value',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'X-Custom-Header-123': 'value',
      })
    })

    test('特殊文字を含む値の場合、そのまま設定されること', async () => {
      const interceptor = injector({
        headers: () => ({
          'X-Custom': 'value with spaces, symbols: !@#$%',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'X-Custom': 'value with spaces, symbols: !@#$%',
      })
    })

    test('大文字小文字が異なる同じ名前の場合、両方保持されること', async () => {
      const interceptor = injector({
        headers: () => ({
          'Content-Type': 'text/plain',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          headers: {
            'content-type': 'application/json',
          },
        },
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'content-type': 'application/json',
        'Content-Type': 'text/plain',
      })
    })

    test('送信方法や送信先が保持されること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/data',
        options: {},
        body: { key: 'value' },
      }

      const response = await interceptor(context)

      expect(response.method).toBe('POST')
      expect(response.endpoint).toBe('/api/data')
      expect(response.body).toEqual({ key: 'value' })
    })

    test('見出し以外の送信設定が保持されること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          timeout: 5000,
          queries: { page: 1 },
          base: 'https://api.example.com',
          unsafe: true,
          localhost: false,
        },
      }

      const response = await interceptor(context)

      expect(response.options.timeout).toBe(5000)
      expect(response.options.queries).toEqual({ page: 1 })
      expect(response.options.base).toBe('https://api.example.com')
      expect(response.options.unsafe).toBe(true)
      expect(response.options.localhost).toBe(false)
    })

    test('複数のインスタンスが互いに干渉しないこと', async () => {
      const interceptor1 = injector({
        headers: () => ({
          'X-Client': 'App1',
        }),
      })

      const interceptor2 = injector({
        headers: () => ({
          'X-Client': 'App2',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response1 = await interceptor1(context)
      const response2 = await interceptor2(context)

      expect(response1.options.headers).toEqual({ 'X-Client': 'App1' })
      expect(response2.options.headers).toEqual({ 'X-Client': 'App2' })
    })

    test('同じインターセプターを複数回適用した場合、正しく追加されること', async () => {
      const interceptor = injector({
        headers: () => ({
          'X-Custom': 'value',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response1 = await interceptor(context)
      const response2 = await interceptor(response1)

      expect(response2.options.headers).toEqual({
        'X-Custom': 'value',
      })
    })

    test('非ASCII文字を含む値の場合、そのまま設定されること', async () => {
      const interceptor = injector({
        headers: () => ({
          'X-Message': '日本語テスト',
          'X-Emoji': '🚀',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response.options.headers).toEqual({
        'X-Message': '日本語テスト',
        'X-Emoji': '🚀',
      })
    })

    test('元のコンテキストが変更されないこと', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      }

      const original = { ...context }
      await interceptor(context)

      expect(context).toEqual(original)
    })

    test('返り値の型がコンテキストであること', async () => {
      const interceptor = injector({
        headers: () => ({
          Authorization: 'Bearer token',
        }),
      })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = await interceptor(context)

      expect(response).toHaveProperty('method')
      expect(response).toHaveProperty('endpoint')
      expect(response).toHaveProperty('options')
    })
  })
})
