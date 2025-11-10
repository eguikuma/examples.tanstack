import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { InvalidUrlError, UnsafeUrlError, UrlTooLongError } from './errors'
import type { RequestInterceptor, ResponseInterceptor } from './models'
import { Http } from './request'

vi.mock('node:fs')

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response())),
  )
})

describe('Http', () => {
  describe('get', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
      const data = { id: 1, name: 'get.2xx' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.get('https://api.example.com/users')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET',
        }),
      )
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.NOT_FOUND) }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const response = await http.get('https://api.example.com/users/999')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.NOT_FOUND)
      }
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) }),
          {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        ),
      )

      const http = new Http()
      const response = await http.get('https://api.example.com/users')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('post', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
      const data = { name: 'post.2xx' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.post('https://api.example.com/users', data)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        }),
      )
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.BAD_REQUEST) }), {
          status: StatusCodes.BAD_REQUEST,
        }),
      )

      const http = new Http()
      const response = await http.post('https://api.example.com/users', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.BAD_REQUEST)
      }
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) }),
          {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        ),
      )

      const http = new Http()
      const response = await http.post('https://api.example.com/users', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('put', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
      const data = { name: 'put.2xx' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.put('https://api.example.com/users/1', data)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      )
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.NOT_FOUND) }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const response = await http.put('https://api.example.com/users/999', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.NOT_FOUND)
      }
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) }),
          {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        ),
      )

      const http = new Http()
      const response = await http.put('https://api.example.com/users/1', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('delete', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(null, { status: StatusCodes.NO_CONTENT }),
      )

      const http = new Http()
      const response = await http.delete('https://api.example.com/users/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toBeUndefined()
      }
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.NOT_FOUND) }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const response = await http.delete('https://api.example.com/users/999')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.NOT_FOUND)
      }
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) }),
          {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        ),
      )

      const http = new Http()
      const response = await http.delete('https://api.example.com/users/1')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('patch', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
      const data = { name: 'patch.2xx' }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const response = await http.patch('https://api.example.com/users/1', data)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      )
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data).toEqual(data)
      }
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.NOT_FOUND) }), {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const response = await http.patch('https://api.example.com/users/999', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.NOT_FOUND)
      }
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) }),
          {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          },
        ),
      )

      const http = new Http()
      const response = await http.patch('https://api.example.com/users/1', {})

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('options', () => {
    describe('base', () => {
      test('相対URLと結合すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('/users')

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.any(Object),
        )
      })

      test('絶対URLの場合、上書きすること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('https://other.example.com/users')

        expect(global.fetch).toHaveBeenCalledWith(
          'https://other.example.com/users',
          expect.any(Object),
        )
      })

      test('相対URLと絶対URLが結合されること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api1.example.com' })
        await http.get('/users', { base: 'https://api2.example.com' })

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api2.example.com/users',
          expect.any(Object),
        )
      })

      test('空文字列の場合、ベースのURLのみでリクエストすること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('')

        expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', expect.any(Object))
      })
    })

    describe('queries', () => {
      test('クエリパラメータを付加すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('/users', { queries: { page: 1, limit: 10 } })

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/users?page=1&limit=10',
          expect.any(Object),
        )
      })

      test('既存のクエリパラメータに追加すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('/users?sort=desc', { queries: { page: 1 } })

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/users?sort=desc&page=1',
          expect.any(Object),
        )
      })

      test('クエリパラメータを文字列に変換すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ base: 'https://api.example.com' })
        await http.get('/users', { queries: { offset: 0, enabled: false } })

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/users?offset=0&enabled=false',
          expect.any(Object),
        )
      })
    })

    describe('timeout', () => {
      test('タイムアウト前に完了した場合、成功結果を返すこと', async () => {
        vi.useFakeTimers()

        vi.mocked(global.fetch).mockImplementation(
          (_url, options) =>
            new Promise((resolve, reject) => {
              options?.signal?.addEventListener('abort', () =>
                reject(new DOMException('This request is expected not to time out', 'AbortError')),
              )

              setTimeout(() => {
                resolve(
                  new Response(JSON.stringify({}), {
                    status: StatusCodes.OK,
                    headers: { 'Content-Type': 'application/json' },
                  }),
                )
              }, 9000)
            }),
        )

        const http = new Http({ timeout: 10000 })
        const promise = http.get('https://api.example.com/users')

        await vi.advanceTimersByTimeAsync(9000)
        const response = await promise

        expect(response.success).toBe(true)
        vi.useRealTimers()
      })

      test('タイムアウト後の場合、失敗結果を返すこと', async () => {
        vi.useFakeTimers()

        vi.mocked(global.fetch).mockImplementation(
          (_url, options) =>
            new Promise((resolve, reject) => {
              options?.signal?.addEventListener('abort', () =>
                reject(new DOMException('This request is expected to time out', 'AbortError')),
              )

              setTimeout(() => {
                resolve(
                  new Response(JSON.stringify({}), {
                    status: StatusCodes.OK,
                    headers: { 'Content-Type': 'application/json' },
                  }),
                )
              }, 11000)
            }),
        )

        const http = new Http({ timeout: 10000 })
        const promise = http.get('https://api.example.com/users')

        await vi.advanceTimersByTimeAsync(10000)
        const response = await promise

        expect(response.success).toBe(false)
        if (!response.success) {
          expect(response.status).toBe(StatusCodes.REQUEST_TIMEOUT)
        }
        vi.useRealTimers()
      })

      test('グローバルに値を設定すること', async () => {
        const timeout = vi.spyOn(global, 'setTimeout')
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ timeout: 5000 })
        await http.get('https://api.example.com/users')

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 5000)
        timeout.mockRestore()
      })

      test('リクエスト単位で値を設定すること', async () => {
        const timeout = vi.spyOn(global, 'setTimeout')
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ timeout: 5000 })
        await http.get('https://api.example.com/users', { timeout: 3000 })

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 3000)
        timeout.mockRestore()
      })

      test('デフォルトで10000ミリ秒を設定すること', async () => {
        const timeout = vi.spyOn(global, 'setTimeout')
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        await http.get('https://api.example.com/users')

        expect(timeout).toHaveBeenCalledWith(expect.any(Function), 10000)
        timeout.mockRestore()
      })
    })

    describe('credentials', () => {
      test('グローバルに値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ credentials: 'include' })
        await http.get('https://api.example.com/users')

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'include' }),
        )
      })

      test('リクエスト単位で値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ credentials: 'include' })
        await http.get('https://api.example.com/users', { credentials: 'omit' })

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'omit' }),
        )
      })

      test('デフォルトでsame-originを設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        await http.get('https://api.example.com/users')

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'same-origin' }),
        )
      })
    })

    describe('headers', () => {
      test('JSONの場合、Content-Typeを自動設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.CREATED }),
        )

        const http = new Http()
        await http.post('https://api.example.com/users', { name: 'I am JSON' })

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          }),
        )
      })

      test('GETリクエストの場合、Content-Typeを設定しないこと', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        await http.get('https://api.example.com/users')

        const call = vi.mocked(global.fetch).mock.calls[0]
        expect(call).toBeDefined()
        const options = call?.[1] as RequestInit
        expect(options.headers).not.toHaveProperty('Content-Type')
      })

      test('指定されたContent-Typeを使用すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.CREATED }),
        )

        const http = new Http()
        await http.post(
          'https://api.example.com/users',
          { name: 'test' },
          {
            headers: { 'Content-Type': 'application/xml' },
          },
        )

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ 'Content-Type': 'application/xml' }),
          }),
        )
      })

      test('FormDataの場合、Content-Typeを設定しないこと', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.CREATED }),
        )

        const http = new Http()
        const data = new FormData()
        data.append('file', 'upload')
        await http.post('https://api.example.com/upload', data)

        const call = vi.mocked(global.fetch).mock.calls[0]
        expect(call).toBeDefined()
        const options = call?.[1] as RequestInit
        expect(options.headers).not.toHaveProperty('Content-Type')
      })

      test('グローバルに値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ headers: { 'X-API-Key': 'i-am-global' } })
        await http.get('https://api.example.com/users')

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-API-Key': 'i-am-global' }),
          }),
        )
      })

      test('リクエスト単位で値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ headers: { 'X-API-Key': 'i-am-global' } })
        await http.get('https://api.example.com/users', {
          headers: { 'X-API-Key': 'i-am-override' },
        })

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-API-Key': 'i-am-override' }),
          }),
        )
      })
    })

    describe('verify', () => {
      test('検証をパスした場合、成功結果を返すこと', async () => {
        const data = { id: 1, name: 'verify-pass' }
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify(data), {
            status: StatusCodes.OK,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const http = new Http()
        const response = await http.get<typeof data>('https://api.example.com/users/1', {
          verify: ({ id }) => typeof id === 'number',
        })

        expect(response.success).toBe(true)
        if (response.success) {
          expect(response.data).toEqual(data)
        }
      })

      test('検証をパスしなかった場合、失敗結果を返すこと', async () => {
        const data = { id: 'invalid', name: 'verify-not-pass' }
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify(data), {
            status: StatusCodes.OK,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const http = new Http()
        const response = await http.get<{ id: number; name: string }>(
          'https://api.example.com/users/1',
          {
            verify: ({ id }) => typeof id === 'number',
          },
        )

        expect(response.success).toBe(false)
      })
    })

    describe('unsafe', () => {
      test('グローバルに値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ unsafe: true })
        const response = await http.get('http://127.0.0.1')

        expect(response.success).toBe(true)
      })

      test('リクエスト単位で値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        const response = await http.get('http://127.0.0.1', { unsafe: true })

        expect(response.success).toBe(true)
      })

      test('デフォルトでfalseを設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        const response = await http.get('http://127.0.0.1')

        expect(response.success).toBe(false)
      })
    })

    describe('localhost', () => {
      test('グローバルに値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http({ localhost: true })
        const response = await http.get('http://localhost')

        expect(response.success).toBe(true)
      })

      test('リクエスト単位で値を設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        const response = await http.get('http://localhost', { localhost: true })

        expect(response.success).toBe(true)
      })

      test('デフォルトでfalseを設定すること', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: StatusCodes.OK }),
        )

        const http = new Http()
        const response = await http.get('http://localhost')

        expect(response.success).toBe(false)
      })
    })

    describe('interceptors', () => {
      describe('request', () => {
        test('インターセプターを実行すること', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({}), { status: StatusCodes.OK }),
          )

          const interceptor: RequestInterceptor = (context) => ({
            ...context,
            options: {
              ...context.options,
              headers: { ...context.options.headers, 'X-Intercepted': 'true' },
            },
          })

          const http = new Http({ interceptors: { request: [interceptor] } })
          await http.get('https://api.example.com/users')

          expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              headers: expect.objectContaining({ 'X-Intercepted': 'true' }),
            }),
          )
        })

        test('複数のインターセプターを順番に実行すること', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({}), { status: StatusCodes.OK }),
          )

          const orders: number[] = []

          const interceptor1: RequestInterceptor = (context) => {
            orders.push(1)

            return context
          }

          const interceptor2: RequestInterceptor = (context) => {
            orders.push(2)

            return context
          }

          const http = new Http({ interceptors: { request: [interceptor1, interceptor2] } })
          await http.get('https://api.example.com/users')

          expect(orders).toEqual([1, 2])
        })

        test('ハンドラー内でエラーが発生した場合、失敗結果を返すこと', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({}), { status: StatusCodes.OK }),
          )

          const interceptor: RequestInterceptor = () => {
            throw new Error('The request interceptor was aborted')
          }

          const http = new Http({ interceptors: { request: [interceptor] } })
          const response = await http.get('https://api.example.com/users')

          expect(response.success).toBe(false)
          if (!response.success) {
            expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
          }
        })
      })

      describe('response', () => {
        test('インターセプターを実行すること', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ original: true }), {
              status: StatusCodes.OK,
              headers: { 'Content-Type': 'application/json' },
            }),
          )

          let intercepted = false
          const interceptor: ResponseInterceptor = (context) => {
            intercepted = true

            return context
          }

          const http = new Http({ interceptors: { response: [interceptor] } })
          await http.get('https://api.example.com/users')

          expect(intercepted).toBe(true)
        })

        test('インターセプター内で結果を変更できること', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ original: true }), {
              status: StatusCodes.OK,
              headers: { 'Content-Type': 'application/json' },
            }),
          )

          const interceptor: ResponseInterceptor = (context) => {
            const modified = {
              ...context,
              outcome: {
                success: true as const,
                status: StatusCodes.OK,
                data: { modified: true },
              },
            }

            return modified as typeof context
          }

          const http = new Http({ interceptors: { response: [interceptor] } })
          const response = await http.get('https://api.example.com/users')

          expect(response.success).toBe(true)
          if (response.success) {
            expect(response.data).toEqual({ modified: true })
          }
        })

        test('複数のインターセプターを順番に実行すること', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ original: true }), {
              status: StatusCodes.OK,
              headers: { 'Content-Type': 'application/json' },
            }),
          )

          const orders: number[] = []

          const interceptor1: ResponseInterceptor = (context) => {
            orders.push(1)

            return context
          }

          const interceptor2: ResponseInterceptor = (context) => {
            orders.push(2)

            return context
          }

          const http = new Http({ interceptors: { response: [interceptor1, interceptor2] } })
          await http.get('https://api.example.com/users')

          expect(orders).toEqual([1, 2])
        })

        test('ハンドラー内でエラーが発生した場合、失敗結果を返すこと', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ original: true }), {
              status: StatusCodes.OK,
              headers: { 'Content-Type': 'application/json' },
            }),
          )

          const interceptor: ResponseInterceptor = () => {
            throw new Error('The response interceptor was aborted')
          }

          const http = new Http({ interceptors: { response: [interceptor] } })
          const response = await http.get('https://api.example.com/users')

          expect(response.success).toBe(false)
          if (!response.success) {
            expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
          }
        })
      })

      describe('on', () => {
        test('成功コールバックを呼び出すこと', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ id: 1 }), {
              status: StatusCodes.OK,
              headers: { 'Content-Type': 'application/json' },
            }),
          )

          const success = vi.fn()
          const http = new Http({ interceptors: { on: { success } } })
          await http.get('https://api.example.com/users')

          expect(success).toHaveBeenCalled()
        })

        test('失敗コールバックを呼び出すこと', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.BAD_REQUEST) }), {
              status: StatusCodes.BAD_REQUEST,
            }),
          )

          const failure = vi.fn()
          const http = new Http({ interceptors: { on: { failure } } })
          await http.get('https://api.example.com/users')

          expect(failure).toHaveBeenCalled()
        })

        test('未認証コールバックを呼び出すこと', async () => {
          vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ error: getReasonPhrase(StatusCodes.UNAUTHORIZED) }), {
              status: StatusCodes.UNAUTHORIZED,
            }),
          )

          const unauthorized = vi.fn()
          const http = new Http({ interceptors: { on: { unauthorized } } })
          await http.get('https://api.example.com/users')

          expect(unauthorized).toHaveBeenCalled()
        })
      })
    })
  })

  describe('assert', () => {
    test('無効なURL形式をブロックすること', async () => {
      const http = new Http()
      const response = await http.get('htp://invalid url')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new InvalidUrlError().message)
      }
    })

    test('無効なプロトコルをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('file:///etc/passwd')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new UnsafeUrlError().message)
      }
    })

    test('localhostをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://localhost/api')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new UnsafeUrlError().message)
      }
    })

    test('プライベートネットワークをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://192.168.1.1/admin')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new UnsafeUrlError().message)
      }
    })

    test('クラウドメタデータをブロックすること', async () => {
      const http = new Http()
      const response = await http.get('http://169.254.169.254/latest/meta-data/')

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new UnsafeUrlError().message)
      }
    })

    test(`${UrlTooLongError.MaxLength}文字を許可すること`, async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const http = new Http()
      const route = 'a'.repeat(UrlTooLongError.MaxLength - 'https://api.example.com/'.length)
      const response = await http.get(`https://api.example.com/${route}`)

      expect(response.success).toBe(true)
    })

    test(`${UrlTooLongError.MaxLength}文字を超える場合、ブロックすること`, async () => {
      const http = new Http()
      const route = 'a'.repeat(UrlTooLongError.MaxLength + 1 - 'https://api.example.com/'.length)
      const response = await http.get(`https://api.example.com/${route}`)

      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.message).toBe(new UrlTooLongError().message)
      }
    })
  })

  describe('extend', () => {
    test('URLを拡張すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const base = new Http({ base: 'https://api.example.com' })
      const extended = base.extend({ base: '/v1' })
      await extended.get('/users')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/users',
        expect.any(Object),
      )
    })

    test('親のヘッダーを子が拡張すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const base = new Http({
        base: 'https://api.example.com',
        headers: { 'X-Parent': 'parent', 'X-Base': 'parent' },
      })
      const extended = base.extend({ headers: { 'X-Child': 'child', 'X-Base': 'child' } })
      await extended.get('/users')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Parent': 'parent',
            'X-Child': 'child',
            'X-Base': 'child',
          }),
        }),
      )
    })

    test('親のリクエストインターセプターを子が拡張し、親から順に実行すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const orders: string[] = []

      const base = new Http({
        base: 'https://api.example.com',
        interceptors: {
          request: [
            (context) => {
              orders.push('parent')

              return context
            },
          ],
        },
      })
      const extended = base.extend({
        interceptors: {
          request: [
            (context) => {
              orders.push('child')

              return context
            },
          ],
        },
      })
      await extended.get('/users')

      expect(orders).toEqual(['parent', 'child'])
    })

    test('親のレスポンスインターセプターを子が拡張し、子から順に実行すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const orders: string[] = []

      const base = new Http({
        base: 'https://api.example.com',
        interceptors: {
          response: [
            (context) => {
              orders.push('parent')

              return context
            },
          ],
        },
      })
      const extended = base.extend({
        interceptors: {
          response: [
            (context) => {
              orders.push('child')

              return context
            },
          ],
        },
      })
      await extended.get('/users')

      expect(orders).toEqual(['child', 'parent'])
    })

    test('親のタイムアウトを子が拡張すること', async () => {
      const timeout = vi.spyOn(global, 'setTimeout')
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const base = new Http({ base: 'https://api.example.com', timeout: 5000 })
      const extended = base.extend({ timeout: 3000 })
      await extended.get('/users')

      expect(timeout).toHaveBeenCalledWith(expect.any(Function), 3000)
      timeout.mockRestore()
    })

    test('親の資格情報を子が拡張すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: StatusCodes.OK }),
      )

      const base = new Http({ base: 'https://api.example.com', credentials: 'same-origin' })
      const extended = base.extend({ credentials: 'include' })
      await extended.get('/users')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' }),
      )
    })

    test('拡張時にURLの安全性を検証すること', () => {
      const base = new Http({ base: 'https://api.example.com' })

      expect(() => base.extend({ base: 'http://192.168.1.1' })).toThrow(UnsafeUrlError)
    })
  })
})
