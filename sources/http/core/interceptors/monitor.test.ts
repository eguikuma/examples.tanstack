import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi } from 'vitest'

import { monitor } from './monitor'
import type { RequestContext, ResponseContext } from '../models'

describe('monitor.ts', () => {
  describe('request', () => {
    test('送信情報をログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
        body: undefined,
      }

      const response = interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'GET',
        endpoint: '/api/users',
        options: {},
        body: undefined,
      })
      expect(response).toEqual(context)
    })

    test('送信内容とoptionsを含めてログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/users',
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
        body: { name: 'test' },
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'POST',
        endpoint: '/api/users',
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
        body: { name: 'test' },
      })
    })

    test('コンテキストを変更せずに返すこと', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const response = interceptor(context)

      expect(response).toBe(context)
    })

    test('ログ関数が例外をスローした場合、例外が伝播すること', () => {
      const error = new Error('Observer failed')
      const observer = vi.fn(() => {
        throw error
      })
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      expect(() => interceptor(context)).toThrow(error)
    })

    test('PUT送信方法の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'PUT',
        endpoint: '/api/users/1',
        options: {},
        body: { name: 'updated' },
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'PUT',
        endpoint: '/api/users/1',
        options: {},
        body: { name: 'updated' },
      })
    })

    test('DELETE送信方法の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'DELETE',
        endpoint: '/api/users/1',
        options: {},
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'DELETE',
        endpoint: '/api/users/1',
        options: {},
        body: undefined,
      })
    })

    test('PATCH送信方法の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'PATCH',
        endpoint: '/api/users/1',
        options: {},
        body: { name: 'patched' },
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'PATCH',
        endpoint: '/api/users/1',
        options: {},
        body: { name: 'patched' },
      })
    })

    test('配列の送信内容の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/bulk',
        options: {},
        body: [1, 2, 3],
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'POST',
        endpoint: '/api/bulk',
        options: {},
        body: [1, 2, 3],
      })
    })

    test('nullの送信内容の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/null',
        options: {},
        body: null,
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'POST',
        endpoint: '/api/null',
        options: {},
        body: null,
      })
    })

    test('文字列の送信内容の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'POST',
        endpoint: '/api/text',
        options: {},
        body: 'plain text content',
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'POST',
        endpoint: '/api/text',
        options: {},
        body: 'plain text content',
      })
    })

    test('特殊文字を含む送信先の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users?name=田中&age=20',
        options: {},
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'GET',
        endpoint: '/api/users?name=田中&age=20',
        options: {},
        body: undefined,
      })
    })

    test('空の送信設定の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'request',
        method: 'GET',
        endpoint: '/api/users',
        options: {},
        body: undefined,
      })
    })

    test('ログ関数が1回だけ呼ばれること', () => {
      const observer = vi.fn()
      const interceptor = monitor.requested({ observer })

      const context: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledTimes(1)
    })

    test('複数のインスタンスが互いに干渉しないこと', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()
      const interceptor1 = monitor.requested({ observer: observer1 })
      const interceptor2 = monitor.requested({ observer: observer2 })

      const context1: RequestContext = {
        method: 'GET',
        endpoint: '/api/users',
        options: {},
      }

      const context2: RequestContext = {
        method: 'POST',
        endpoint: '/api/posts',
        options: {},
        body: { title: 'test' },
      }

      interceptor1(context1)
      interceptor2(context2)

      expect(observer1).toHaveBeenCalledTimes(1)
      expect(observer1).toHaveBeenCalledWith({
        kind: 'request',
        method: 'GET',
        endpoint: '/api/users',
        options: {},
        body: undefined,
      })
      expect(observer2).toHaveBeenCalledTimes(1)
      expect(observer2).toHaveBeenCalledWith({
        kind: 'request',
        method: 'POST',
        endpoint: '/api/posts',
        options: {},
        body: { title: 'test' },
      })
    })
  })

  describe('response', () => {
    test('応答情報をログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
        }),
      }

      const response = interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/users',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
      })
      expect(response).toEqual(context)
    })

    test('コンテキストを変更せずに返すこと', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'POST',
        endpoint: '/api/posts',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: 'OK',
        },
        raw: new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      }

      const response = interceptor(context)

      expect(response).toBe(context)
    })

    test('エラーの応答もログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/notfound',
        outcome: {
          success: false,
          status: StatusCodes.NOT_FOUND,
          message: 'Not Found',
        },
        raw: new Response(JSON.stringify({ message: 'Not Found' }), {
          status: StatusCodes.NOT_FOUND,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/notfound',
        status: StatusCodes.NOT_FOUND,
        outcome: {
          success: false,
          status: StatusCodes.NOT_FOUND,
          message: 'Not Found',
        },
      })
    })

    test('ログ関数が例外をスローした場合、例外が伝播すること', () => {
      const error = new Error('Observer failed')
      const observer = vi.fn(() => {
        throw error
      })
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
        }),
      }

      expect(() => interceptor(context)).toThrow(error)
    })

    test('dataがundefinedの場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'DELETE',
        endpoint: '/api/users/1',
        outcome: {
          success: true,
          status: StatusCodes.NO_CONTENT,
          data: undefined,
        },
        raw: new Response(null, {
          status: StatusCodes.NO_CONTENT,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'DELETE',
        endpoint: '/api/users/1',
        status: StatusCodes.NO_CONTENT,
        outcome: {
          success: true,
          status: StatusCodes.NO_CONTENT,
          data: undefined,
        },
      })
    })

    test('応答URLが空文字列の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
        }),
      }
      const { url } = context.raw

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
      })
      expect(url).toBe('')
    })

    test('201応答の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'POST',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.CREATED,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.CREATED,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'POST',
        endpoint: '/api/users',
        status: StatusCodes.CREATED,
        outcome: {
          success: true,
          status: StatusCodes.CREATED,
          data: { id: 1 },
        },
      })
    })

    test('500応答の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/error',
        outcome: {
          success: false,
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
        },
        raw: new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/error',
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        outcome: {
          success: false,
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
        },
      })
    })

    test('0応答の場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/zero',
        outcome: {
          success: false,
          status: 0,
          message: 'Internal Server Error',
        },
        raw: new Response(null, {
          status: 0,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/zero',
        status: 0,
        outcome: {
          success: false,
          status: 0,
          message: 'Internal Server Error',
        },
      })
    })

    test('配列データの場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: [{ id: 1 }, { id: 2 }],
        },
        raw: new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), {
          status: StatusCodes.OK,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/users',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: [{ id: 1 }, { id: 2 }],
        },
      })
    })

    test('nullデータの場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/null',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: null,
        },
        raw: new Response(null, {
          status: StatusCodes.OK,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/null',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: null,
        },
      })
    })

    test('文字列データの場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'POST',
        endpoint: '/api/error',
        outcome: {
          success: false,
          status: StatusCodes.BAD_REQUEST,
          message: 'error message',
        },
        raw: new Response('error message', {
          status: StatusCodes.BAD_REQUEST,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'POST',
        endpoint: '/api/error',
        status: StatusCodes.BAD_REQUEST,
        outcome: {
          success: false,
          status: StatusCodes.BAD_REQUEST,
          message: 'error message',
        },
      })
    })

    test('数値データの場合、正しくログ出力すること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/number',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: 42,
        },
        raw: new Response('42', {
          status: StatusCodes.OK,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/number',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: 42,
        },
      })
    })

    test('ログ関数が1回だけ呼ばれること', () => {
      const observer = vi.fn()
      const interceptor = monitor.responded({ observer })

      const context: ResponseContext = {
        method: 'GET',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
        }),
      }

      interceptor(context)

      expect(observer).toHaveBeenCalledTimes(1)
    })

    test('複数のインスタンスが互いに干渉しないこと', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()
      const interceptor1 = monitor.responded({ observer: observer1 })
      const interceptor2 = monitor.responded({ observer: observer2 })

      const context1: ResponseContext = {
        method: 'GET',
        endpoint: '/api/users/1',
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
        raw: new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
        }),
      }

      const context2: ResponseContext = {
        method: 'POST',
        endpoint: '/api/users',
        outcome: {
          success: true,
          status: StatusCodes.CREATED,
          data: { id: 2 },
        },
        raw: new Response(JSON.stringify({ id: 2 }), {
          status: StatusCodes.CREATED,
        }),
      }

      interceptor1(context1)
      interceptor2(context2)

      expect(observer1).toHaveBeenCalledTimes(1)
      expect(observer1).toHaveBeenCalledWith({
        kind: 'response',
        method: 'GET',
        endpoint: '/api/users/1',
        status: StatusCodes.OK,
        outcome: {
          success: true,
          status: StatusCodes.OK,
          data: { id: 1 },
        },
      })
      expect(observer2).toHaveBeenCalledTimes(1)
      expect(observer2).toHaveBeenCalledWith({
        kind: 'response',
        method: 'POST',
        endpoint: '/api/users',
        status: StatusCodes.CREATED,
        outcome: {
          success: true,
          status: StatusCodes.CREATED,
          data: { id: 2 },
        },
      })
    })
  })
})
