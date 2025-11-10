import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { Http, create } from './request'
import type { RequestInterceptor, ResponseInterceptor, FailureInterceptor } from './models'

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
      const result = await http.get('/api/users')

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('エラーの応答の場合、失敗を示す結果を返すこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('Not Found', {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      const http = new Http()
      const result = await http.get('/api/users')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(StatusCodes.NOT_FOUND)
        expect(result.message).toBe('Not Found')
      }
    })

    test('クエリパラメータを付与すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
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
      const result = await http.post('/api/users', { name: 'new user' })

      expect(result).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: data,
      })
    })

    test('送信内容をデータ形式で送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
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
      const result = await http.put('/api/users/1', { name: 'updated' })

      expect(result).toEqual({
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
      const result = await http.delete('/api/users/1')

      expect(result).toEqual({
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
      const result = await http.patch('/api/users/1', { name: 'patched' })

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })
  })

  describe('インターセプター', () => {
    test('送信時の割り込み処理を適用すること', async () => {
      const interceptor: RequestInterceptor = vi.fn((context) => {
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
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({
        interceptors: {
          request: [interceptor],
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

    test('応答時の割り込み処理を適用すること', async () => {
      const interceptor: ResponseInterceptor = vi.fn((context) => {
        return {
          ...context,
          data: { ...(context.data as object), intercepted: true },
        } as typeof context
      })

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({
        interceptors: {
          response: [interceptor],
        },
      })

      const result = await http.get('/api/users')

      expect(interceptor).toHaveBeenCalled()
      if (result.success) {
        expect(result.data).toEqual({ id: 1, intercepted: true })
      }
    })

    test('失敗時の割り込み処理を適用すること', async () => {
      const interceptor: FailureInterceptor = vi.fn(() => ({
        success: false as const,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Custom error',
      }))

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('Server Error', {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }),
      )

      const http = new Http({
        interceptors: {
          failure: interceptor,
        },
      })

      const result = await http.get('/api/users')

      expect(interceptor).toHaveBeenCalled()
      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Custom error',
      })
    })
  })

  describe('タイムアウト', () => {
    test('タイムアウト時間内に応答がある場合、正常に処理すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({ timeout: 1000 })
      const result = await http.get('/api/users')

      expect(result.success).toBe(true)
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
      const result = await http.get('/api/users')

      expect(result.success).toBe(false)
    })
  })

  describe('ヘッダー', () => {
    test('デフォルトヘッダーを適用すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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

    test('コンテンツ形式がパスカルケースで指定されている場合、自動設定されないこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
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

    test('コンテンツ形式が小文字で指定されている場合、自動設定されないこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
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
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    test('コンテンツ形式が大文字で指定されている場合、自動設定されないこと', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
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
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
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
      const result = await http.get('/api/users', {
        verify: (raw) => typeof raw === 'object' && raw !== null,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })

    test('検証関数が失敗を返す場合、失敗を示す結果を返すこと', async () => {
      const data = { id: 1, name: null }
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const result = await http.get('/api/users', {
        verify: (raw) => {
          if (typeof raw !== 'object' || raw === null) return false
          const typed = raw as { id: number; name: string }
          return typeof typed.name === 'string' && typed.name !== null
        },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('Response does not match expected schema')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
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
      const result = await http.get('/api/users')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })
  })

  describe('セキュリティ', () => {
    test('ファイル接続をブロックすること', async () => {
      const http = new Http()
      const result = await http.get('file:///etc/passwd')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ファイル転送接続をブロックすること', async () => {
      const http = new Http()
      const result = await http.get('ftp://example.com/file.txt')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('ローカル環境へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://localhost/api')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('127.0.0.1へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://127.0.0.1:8080/api')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 192.168.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://192.168.1.1/admin')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 10.x.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://10.0.0.1/internal')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('内部ネットワークアドレス 172.16-31.x.x へのアクセスをブロックすること', async () => {
      const http = new Http()

      const result1 = await http.get('http://172.16.0.1/internal')
      expect(result1.success).toBe(false)
      if (!result1.success) {
        expect(result1.message).toBe('URL is not safe for external requests')
      }

      const result2 = await http.get('http://172.31.255.255/internal')
      expect(result2.success).toBe(false)
      if (!result2.success) {
        expect(result2.message).toBe('URL is not safe for external requests')
      }
    })

    test('クラウドメタデータアドレス 169.254.169.254 へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://169.254.169.254/latest/meta-data/')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('0.0.0.0へのアクセスをブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://0.0.0.0/api')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('安全な接続を許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const result = await http.get('https://api.example.com/users')

      expect(result.success).toBe(true)
    })

    test('通常の接続を許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const result = await http.get('http://api.example.com/users')

      expect(result.success).toBe(true)
    })

    test('外部ネットワークアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const result = await http.get('http://8.8.8.8/api')

      expect(result.success).toBe(true)
    })
  })

  describe('アドレス長の検証', () => {
    test('2082文字のアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2082 - base.length)
      const result = await http.get(`${base}${route}`)

      expect(result.success).toBe(true)
    })

    test('2083文字のアドレスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2083 - base.length)
      const result = await http.get(`${base}${route}`)

      expect(result.success).toBe(true)
    })

    test('2084文字のアドレスを拒否すること', async () => {
      const http = new Http()
      const base = 'https://example.com/'
      const route = 'a'.repeat(2084 - base.length)
      const result = await http.get(`${base}${route}`)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL exceeds maximum length of 2083 characters')
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })
  })

  describe('unsafeオプション', () => {
    test('unsafe: trueの場合、ローカル環境へのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({ unsafe: true })
      const result = await http.get('http://localhost:3000/api')

      expect(result.success).toBe(true)
    })

    test('unsafe: trueの場合、内部ネットワークへのアクセスを許可すること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http({ unsafe: true })
      const result = await http.get('http://192.168.1.1/api')

      expect(result.success).toBe(true)
    })

    test('送信ごとにunsafeを指定できること', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = new Http()
      const result = await http.get('http://localhost:8080/api', { unsafe: true })

      expect(result.success).toBe(true)
    })

    test('unsafe未指定の場合、ローカル環境をブロックすること', async () => {
      const http = new Http()
      const result = await http.get('http://localhost:3000/api')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.message).toBe('URL is not safe for external requests')
      }
    })
  })
})
