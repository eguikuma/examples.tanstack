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

      const result = await interceptor(context)

      expect(result.options.headers).toEqual({
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

      const result = await interceptor(context)

      expect(result.options.headers).toEqual({
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

      const result = await interceptor(context)

      expect(result.options.headers).toEqual({
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

      const result = await interceptor(context)

      expect(result.options.headers).toEqual({
        Authorization: 'Bearer token',
        'X-API-Key': 'key456',
      })
    })
  })
})
