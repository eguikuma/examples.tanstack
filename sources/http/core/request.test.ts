import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import type { RequestInterceptor, ResponseInterceptor } from './models'
import { Http, create } from './request'

describe('request.ts', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初期化', () => {
    test('デフォルト設定の場合、クライアントを作成すること', () => {
      const http = new Http()
      expect(http).toBeInstanceOf(Http)
    })

    test('カスタム設定の場合、クライアントを作成すること', () => {
      const http = new Http({
        base: 'https://api.example.com',
        timeout: 5000,
        headers: { 'X-API-Key': 'test' },
      })
      expect(http).toBeInstanceOf(Http)
    })

    test('ファクトリー関数でクライアントを作成できること', () => {
      const http = create()
      expect(http).toBeInstanceOf(Http)
    })
  })

  describe('get', () => {
    test('正常な応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('Content-Typeがtext/plainの場合、テキストとして解析すること', async () => {
      const text = 'Plain text response'
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(text, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )

      const http = new Http()
      const response = await http.get<string>('/api/text')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBe(text)
      }
    })

    test('Content-Typeがapplication/xmlの場合、テキストとして解析すること', async () => {
      const xml = '<?xml version="1.0"?><root><item>test</item></root>'
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(xml, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/xml' },
        }),
      )

      const http = new Http()
      const response = await http.get<string>('/api/data')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBe(xml)
      }
    })

    test('Content-Typeがtext/xmlの場合、テキストとして解析すること', async () => {
      const xml = '<?xml version="1.0"?><data>test</data>'
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(xml, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'text/xml' },
        }),
      )

      const http = new Http()
      const response = await http.get<string>('/api/xml')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBe(xml)
      }
    })

    test('Content-Typeがtext/htmlの場合、テキストとして解析すること', async () => {
      const html = '<html><body>Hello</body></html>'
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(html, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'text/html' },
        }),
      )

      const http = new Http()
      const response = await http.get<string>('/api/page')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBe(html)
      }
    })

    test('Content-Typeが未指定の場合、デフォルトでテキストとして解析すること', async () => {
      const text = 'Default response'
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(text, {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get<string>('/api/unknown')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBe(text)
      }
    })

    test('エラーの応答の場合、失敗を示す結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('Not Found', {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.NOT_FOUND)
        expect(response.message).toBe('Not Found')
      }
    })

    test('TypeErrorが発生した場合、500エラーを返すこと', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Failed to fetch')
      }
    })

    test('文字列がスローされた場合、500エラーとデフォルトメッセージを返すこと', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce('Something went wrong')

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Internal Server Error')
      }
    })

    test('数値がスローされた場合、500エラーとデフォルトメッセージを返すこと', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(0)

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Internal Server Error')
      }
    })

    test('nullがスローされた場合、500エラーとデフォルトメッセージを返すこと', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(null)

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Internal Server Error')
      }
    })

    test('messageプロパティがないErrorの場合、デフォルトメッセージを返すこと', async () => {
      const error = new Error()
      error.message = ''
      vi.mocked(global.fetch).mockRejectedValueOnce(error)

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Internal Server Error')
      }
    })

    test('カスタムErrorクラスが投げられた場合、500エラーとエラーメッセージを返すこと', async () => {
      class CustomError extends Error {
        constructor() {
          super('Custom error occurred')
          this.name = 'CustomError'
        }
      }

      vi.mocked(global.fetch).mockRejectedValueOnce(new CustomError())

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(response.message).toBe('Custom error occurred')
      }
    })

    test('クエリパラメータを付与すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/api/users', {
        queries: { page: 1, limit: 10 },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users?page=1&limit=10',
        expect.any(Object),
      )
    })

    test('数値型のクエリパラメータを文字列として送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/api/users', {
        queries: { page: 1, limit: 10, id: 12345 },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/users?page=1&limit=10&id=12345',
        expect.any(Object),
      )
    })

    test('真偽値型のクエリパラメータを文字列として送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/api/items', {
        queries: { active: true, deleted: false },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/items?active=true&deleted=false',
        expect.any(Object),
      )
    })

    test('文字列、数値、真偽値が混在する場合、全て文字列として送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/api/search', {
        queries: {
          query: 'test',
          page: 2,
          includeArchived: true,
          limit: 50,
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/search?query=test&page=2&includeArchived=true&limit=50',
        expect.any(Object),
      )
    })

    test('数値0と真偽値falseが正しく文字列に変換されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/api/data', {
        queries: {
          offset: 0,
          enabled: false,
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/data?offset=0&enabled=false',
        expect.any(Object),
      )
    })
  })

  describe('post', () => {
    test('正常な応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'new user' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.post('/api/users', { name: 'new user' })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: data,
      })
    })

    test('送信内容をデータ形式で送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.CREATED,
        }),
      )

      const http = new Http()
      const body = { name: 'test' }
      await http.post('/api/users', body)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      )
    })

    test('送信内容がある場合、データ形式を自動で指定すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.CREATED,
        }),
      )

      const http = new Http()
      await http.post('/api/users', { name: 'test' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    test('送信内容がない場合、データ形式を自動で指定しないこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.post('/api/users')

      const calls = vi.mocked(global.fetch).mock.calls[0]
      if (!calls) throw new Error('fetch was not called')
      const options = calls[1] as RequestInit
      expect(options.headers).not.toHaveProperty('Content-Type')
    })
  })

  describe('put', () => {
    test('正常な応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'updated' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.put('/api/users/1', { name: 'updated' })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })
  })

  describe('delete', () => {
    test('正常な応答の場合、成功を示す結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(null, {
          status: StatusCodes.NO_CONTENT,
        }),
      )

      const http = new Http()
      const response = await http.delete('/api/users/1')

      expect(response).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
    })
  })

  describe('patch', () => {
    test('正常な応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'patched' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.patch('/api/users/1', { name: 'patched' })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })
  })

  describe('インターセプター', () => {
    test('送信時の割り込み処理を適用すること', async () => {
      const interceptor = vi.fn<RequestInterceptor>((context) => {
        return {
          ...context,
          options: {
            ...context.options,
            headers: {
              ...context.options.headers,
              'X-Custom-Header': 'test',
            },
          },
        }
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({
        interceptors: {
          request: [interceptor] as RequestInterceptor[],
        },
      })

      await http.get('/api/users')

      expect(interceptor).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test',
          }),
        }),
      )
    })

    test('複数の送信時割り込み処理を順番に適用すること', async () => {
      const orders: number[] = []

      const interceptor1 = vi.fn<RequestInterceptor>((context) => {
        orders.push(1)

        return {
          ...context,
          options: {
            ...context.options,
            headers: {
              ...context.options.headers,
              'X-Order': '1',
            },
          },
        }
      })

      const interceptor2 = vi.fn<RequestInterceptor>((context) => {
        orders.push(2)

        return {
          ...context,
          options: {
            ...context.options,
            headers: {
              ...context.options.headers,
              'X-Order': '2',
            },
          },
        }
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({
        interceptors: {
          request: [interceptor1, interceptor2] as RequestInterceptor[],
        },
      })

      await http.get('/api/users')

      expect(orders).toEqual([1, 2])
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Order': '2',
          }),
        }),
      )
    })

    test('応答時の割り込み処理を適用すること', async () => {
      const interceptor = vi.fn<ResponseInterceptor>((context) => {
        return {
          ...context,
          outcome: {
            ...context.outcome,
            ...(context.outcome.success
              ? {
                  data: {
                    ...context.outcome.data,
                    intercepted: true,
                  },
                }
              : {}),
          },
        }
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({
        interceptors: {
          response: [interceptor] as ResponseInterceptor[],
        },
      })

      const response = await http.get('/api/users')

      expect(interceptor).toHaveBeenCalled()
      if (response.success) {
        expect(response.data).toEqual({ id: 1, intercepted: true })
      }
    })

    test('複数の応答時割り込み処理を順番に適用すること', async () => {
      const orders: number[] = []

      const interceptor1 = vi.fn<ResponseInterceptor>((context) => {
        orders.push(1)

        return {
          ...context,
          outcome: {
            ...context.outcome,
            ...(context.outcome.success
              ? {
                  data: {
                    ...context.outcome.data,
                    step1: true,
                  },
                }
              : {}),
          },
        }
      })

      const interceptor2 = vi.fn<ResponseInterceptor>((context) => {
        orders.push(2)

        return {
          ...context,
          outcome: {
            ...context.outcome,
            ...(context.outcome.success
              ? {
                  data: {
                    ...context.outcome.data,
                    step2: true,
                  },
                }
              : {}),
          },
        }
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({
        interceptors: {
          response: [interceptor1, interceptor2] as ResponseInterceptor[],
        },
      })

      const response = await http.get('/api/users')

      expect(orders).toEqual([1, 2])
      if (response.success) {
        expect(response.data).toEqual({ id: 1, step1: true, step2: true })
      }
    })

    test('成功時の割り込み処理を適用すること', async () => {
      const success = vi.fn()

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({
        interceptors: {
          on: {
            success: success,
          },
        },
      })

      const response = await http.get('/api/users')

      expect(success).toHaveBeenCalledWith({
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      })
      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      })
    })

    test('認証エラー時の割り込み処理を適用すること', async () => {
      const unauthorized = vi.fn()

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: StatusCodes.UNAUTHORIZED,
        }),
      )

      const http = new Http({
        interceptors: {
          on: {
            unauthorized: unauthorized,
          },
        },
      })

      const response = await http.get('/api/users')

      expect(unauthorized).toHaveBeenCalled()
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.UNAUTHORIZED)
      }
    })

    test('失敗時の割り込み処理を適用すること', async () => {
      const failure = vi.fn()

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }),
      )

      const http = new Http({
        interceptors: {
          on: {
            failure: failure,
          },
        },
      })

      const response = await http.get('/api/users')

      expect(failure).toHaveBeenCalled()
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('HTTPメソッドごとの送信内容の扱い', () => {
    test('GETの場合、送信内容をundefinedとすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.get('/api/users')

      const calls = vi.mocked(global.fetch).mock.calls[0]
      const options = calls?.[1] as RequestInit
      expect(options.body).toBeUndefined()
    })

    test('DELETEの場合、送信内容をundefinedとすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(null, {
          status: StatusCodes.NO_CONTENT,
        }),
      )

      const http = new Http()
      await http.delete('/api/users/1')

      const calls = vi.mocked(global.fetch).mock.calls[0]
      const options = calls?.[1] as RequestInit
      expect(options.body).toBeUndefined()
    })
  })

  describe('ベースURLと相対URLの結合', () => {
    test('絶対URLの場合、ベースURLを無視すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('https://other-api.com/users')

      expect(global.fetch).toHaveBeenCalledWith('https://other-api.com/users', expect.any(Object))
    })

    test('送信ごとのベースURLがグローバルのベースURLをオーバーライドすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api1.example.com' })
      await http.get('/users', { base: 'https://api2.example.com' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api2.example.com/users',
        expect.any(Object),
      )
    })

    test('ベースURLの末尾にスラッシュがなく、相対URLの先頭にスラッシュがある場合、正しく結合すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/users')

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object))
    })
  })

  describe('クエリパラメータの結合', () => {
    test('既存のクエリパラメータがあるURLに追加のクエリパラメータを結合すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ base: 'https://api.example.com' })
      await http.get('/users?sort=name', { queries: { page: 1 } })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users?sort=name&page=1',
        expect.any(Object),
      )
    })
  })

  describe('タイムアウト', () => {
    test('タイムアウト時間内に応答がある場合、正常に処理すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ timeout: 1000 })
      const response = await http.get('/api/users')

      expect(response.success).toBe(true)
    })

    test('タイムアウトした場合、AbortErrorが発生すること', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error('The operation was aborted')
              error.name = 'AbortError'
              reject(error)
            }, 100)
          }),
      )

      const http = new Http({ timeout: 50 })
      const response = await http.get('/api/users')

      expect(response.success).toBe(false)
    })

    test('グローバル設定でタイムアウトが0の場合、0が適用されること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ timeout: 0 })
      await http.get('/api/users')

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 0)
      timeout.mockRestore()
    })

    test('送信ごとの設定でタイムアウトが0の場合、0が適用されること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ timeout: 5000 })
      await http.get('/api/users', { timeout: 0 })

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 0)
      timeout.mockRestore()
    })

    test('送信ごとの設定の0がグローバル設定をオーバーライドすること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ timeout: 5000 })
      await http.get('/api/users', { timeout: 0 })

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 0)
      timeout.mockRestore()
    })

    test('送信ごとの設定の5000がグローバル設定の0をオーバーライドすること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ timeout: 0 })
      await http.get('/api/users', { timeout: 5000 })

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 5000)
      timeout.mockRestore()
    })

    test('両方未指定の場合、デフォルト10000msが適用されること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.get('/api/users')

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 10000)
      timeout.mockRestore()
    })
  })

  describe('credentials設定', () => {
    test('グローバル設定でincludeを指定した場合、適用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ credentials: 'include' })
      await http.get('/api/users')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      )
    })

    test('送信ごとの設定のomitがグローバル設定のincludeをオーバーライドすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ credentials: 'include' })
      await http.get('/api/users', { credentials: 'omit' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'omit',
        }),
      )
    })

    test('両方未指定の場合、デフォルトsame-originが適用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.get('/api/users')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'same-origin',
        }),
      )
    })

    test('送信ごとの設定のincludeがグローバル設定のsame-originをオーバーライドすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ credentials: 'same-origin' })
      await http.get('/api/users', { credentials: 'include' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        }),
      )
    })
  })

  describe('ヘッダー', () => {
    test('デフォルトヘッダーを適用すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({
        headers: { 'X-API-Key': 'test' },
      })

      await http.get('/api/users')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test',
          }),
        }),
      )
    })

    test('送信ごとのヘッダーがデフォルトヘッダーをオーバーライドすること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({
        headers: { 'X-API-Key': 'default' },
      })

      await http.get('/api/users', {
        headers: { 'X-API-Key': 'override' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'override',
          }),
        }),
      )
    })

    test('データ形式を標準形式で指定した場合、指定した形式が使用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.post(
        '/api/users',
        { name: 'test' },
        {
          headers: { 'Content-Type': 'application/xml' },
        },
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
          }),
        }),
      )
    })

    test('データ形式を小文字で指定した場合、指定した形式が使用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.post(
        '/api/users',
        { name: 'test' },
        {
          headers: { 'content-type': 'application/xml' },
        },
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/xml',
          }),
        }),
      )
    })

    test('データ形式を大文字で指定した場合、指定した形式が使用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.post(
        '/api/users',
        { name: 'test' },
        {
          headers: { 'CONTENT-TYPE': 'application/xml' },
        },
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'CONTENT-TYPE': 'application/xml',
          }),
        }),
      )
    })

    test('ISO-8859-1範囲外の文字を含むデータ形式を指定した場合、エラーを返すこと', async () => {
      const http = new Http()
      const response = await http.post(
        '/api/users',
        { name: 'test' },
        {
          headers: { 'Content-Type': 'application/json; charset=日本語' },
        },
      )

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('Request metadata contains non-ISO-8859-1 characters')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ISO-8859-1範囲外の文字を含むカスタムヘッダーの場合、エラーを返すこと', async () => {
      const http = new Http()
      const response = await http.get('/api/users', {
        headers: { 'X-Custom-Header': '日本語ヘッダー' },
      })

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('Request metadata contains non-ISO-8859-1 characters')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('データ形式を空文字列で指定した場合、指定した空文字列がそのまま使用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.post(
        '/api/users',
        { name: 'test' },
        {
          headers: { 'Content-Type': '' },
        },
      )

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': '',
          }),
        }),
      )
    })

    test('送信内容なしでデータ形式を指定した場合、指定した形式が使用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      await http.get('/api/users', {
        headers: { 'Content-Type': 'application/xml' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
          }),
        }),
      )
    })
  })

  describe('検証', () => {
    test('検証関数が成功を返す場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.get('/api/users', {
        verify: (raw) => typeof raw === 'object' && raw !== null,
      })

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })

    test('検証関数が失敗を返す場合、失敗を示す結果を返すこと', async () => {
      const data = { id: 1, name: null }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('/api/users', {
        verify: (raw) => {
          if (typeof raw !== 'object' || raw === null) return false
          const typed = raw as { id: number; name: string }
          return typeof typed.name === 'string' && typed.name !== null
        },
      })

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('Response does not match expected schema')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('検証関数が指定されていない場合、通常通り動作すること', async () => {
      const data = { id: 1, name: 'test' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.get('/api/users')

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })
  })

  describe('セキュリティ', () => {
    test('不正な形式のアドレスの場合、エラーを返すこと', async () => {
      const http = new Http()
      const response = await http.get('htp://invalid url with spaces')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL syntax is invalid')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ファイル接続をブロックすること', async () => {
      const http = new Http()
      const response = await http.get('file:///etc/passwd')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ファイル転送接続をブロックすること', async () => {
      const http = new Http()
      const response = await http.get('ftp://example.com/file.txt')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ローカル環境へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://localhost/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('127.0.0.1へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://127.0.0.1:8080/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 192.168.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://192.168.1.1/admin')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 10.x.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://10.0.0.1/internal')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 172.16-31.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()

      const response1 = await http.get('http://172.16.0.1/internal')
      expect(response1.success).toBe(false)
      if (!response1.success) {
        expect(response1.message).toBe('URL is not safe for external requests')
      }

      const response2 = await http.get('http://172.31.255.255/internal')
      expect(response2.success).toBe(false)
      if (!response2.success) {
        expect(response2.message).toBe('URL is not safe for external requests')
      }
    })

    test('クラウドメタデータアドレス 169.254.169.254 へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://169.254.169.254/latest/meta-data/')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('0.0.0.0へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://0.0.0.0/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('次世代プロトコルのループバックアドレス::1へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://[::1]/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('次世代プロトコルのリンクローカルアドレスfe80::へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://[fe80::1]/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('次世代プロトコルのプライベートアドレスfc00::へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://[fc00::1]/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('次世代プロトコルのプライベートアドレスfd00::へのアクセスをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://[fd00::1]/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('安全な接続を許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('https://api.example.com/users')

      expect(response.success).toBe(true)
    })

    test('通常の接続を許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('http://api.example.com/users')

      expect(response.success).toBe(true)
    })

    test('外部ネットワークアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('http://8.8.8.8/api')

      expect(response.success).toBe(true)
    })
  })

  describe('アドレス長の検証', () => {
    test('2082文字のアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2082 - base.length)
      const response = await http.get(`${base}${route}`)

      expect(response.success).toBe(true)
    })

    test('2083文字のアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2083 - base.length)
      const response = await http.get(`${base}${route}`)

      expect(response.success).toBe(true)
    })

    test('2084文字のアドレスを拒否すること', async () => {
      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2084 - base.length)
      const response = await http.get(`${base}${route}`)

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL exceeds maximum length of 2083 characters')
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('unsafeオプション', () => {
    test('unsafe: trueの場合、ローカル環境へのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ unsafe: true })
      const response = await http.get('http://localhost:3000/api')

      expect(response.success).toBe(true)
    })

    test('unsafe: trueの場合、内部ネットワークへのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ unsafe: true })
      const response = await http.get('http://192.168.1.1/api')

      expect(response.success).toBe(true)
    })

    test('送信ごとにunsafeを指定できること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('http://localhost:8080/api', { unsafe: true })

      expect(response.success).toBe(true)
    })

    test('unsafe未指定の場合、ローカル環境をブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://localhost:3000/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe('URL is not safe for external requests')
      }
    })
  })

  describe('localhostオプション', () => {
    test('グローバル設定でlocalhostがtrueの場合、localhostへのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ localhost: true })
      const response = await http.get('http://localhost:3000/api')

      expect(response.success).toBe(true)
    })

    test('グローバル設定でlocalhostがtrueの場合、127.0.0.1へのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http({ localhost: true })
      const response = await http.get('http://127.0.0.1:8080/api')

      expect(response.success).toBe(true)
    })

    test('送信ごとにlocalhostをtrueに指定できること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
        }),
      )

      const http = new Http()
      const response = await http.get('http://localhost:3000/api', { localhost: true })

      expect(response.success).toBe(true)
    })
  })
})
