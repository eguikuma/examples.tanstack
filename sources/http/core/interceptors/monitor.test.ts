import { describe, test, expect, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { monitor } from './monitor'
import type { RequestContext, ResponseContext } from '../models'

describe('monitor.ts', () => {
  describe('requester', () => {
    test('送信情報をログ出力すること', () => {
      const logger = vi.fn()
      const interceptor = monitor.requester({ logger })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
        body: undefined,
      }

      const result = interceptor(context)

      expect(logger).toHaveBeenCalledWith('GET /api/users', {
        options: {},
        body: undefined,
      })
      expect(result).toEqual(context)
    })

    test('送信内容とoptionsを含めてログ出力すること', () => {
      const logger = vi.fn()
      const interceptor = monitor.requester({ logger })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/users',
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
        body: { name: 'test' },
      }

      interceptor(context)

      expect(logger).toHaveBeenCalledWith('POST /api/users', {
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
        body: { name: 'test' },
      })
    })

    test('コンテキストを変更せずに返すこと', () => {
      const logger = vi.fn()
      const interceptor = monitor.requester({ logger })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const result = interceptor(context)

      expect(result).toBe(context)
    })
  })

  describe('responder', () => {
    test('応答情報をログ出力すること', () => {
      const logger = vi.fn()
      const interceptor = monitor.responder({ logger })

      const response = new Response(JSON.stringify({ id: 1 }), {
        status: StatusCodes.OK,
      })

      const context: ResponseContext = {
        response: response,
        data: { id: 1 },
      }

      const result = interceptor(context)

      expect(logger).toHaveBeenCalledWith(`200 ${response.url}`, { id: 1 })
      expect(result).toEqual(context)
    })

    test('コンテキストを変更せずに返すこと', () => {
      const logger = vi.fn()
      const interceptor = monitor.responder({ logger })

      const response = new Response(JSON.stringify({}), {
        status: StatusCodes.OK,
      })

      const context: ResponseContext = {
        response: response,
        data: {},
      }

      const result = interceptor(context)

      expect(result).toBe(context)
    })

    test('エラーの応答もログ出力すること', () => {
      const logger = vi.fn()
      const interceptor = monitor.responder({ logger })

      const response = new Response('Not Found', {
        status: StatusCodes.NOT_FOUND,
      })

      const context: ResponseContext = {
        response: response,
        data: { message: 'Not Found' },
      }

      interceptor(context)

      expect(logger).toHaveBeenCalledWith(`404 ${response.url}`, { message: 'Not Found' })
    })
  })
})
