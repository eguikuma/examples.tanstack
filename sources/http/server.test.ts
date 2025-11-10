import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { server } from './server'

describe('server.ts', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    test('指定したアドレスから情報を取得すること', async () => {
      const data = { id: 1, name: 'Test User' }
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.get<typeof data>('/users/1')

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    test('サーバー側の関数で情報を取得すること', async () => {
      const data = { id: 1, name: 'Test User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.get<typeof data>(action)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data,
      })
      expect(action).toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('サーバー側の関数がエラーをスローした場合、Failedを返すこと', async () => {
      const action = vi.fn(async () => {
        throw new Error('Network error')
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Network error',
      })
    })

    test('サーバー側の関数で検証が失敗した場合、エラーを返すこと', async () => {
      const action = vi.fn(async () => {
        return new Response(JSON.stringify({ wrong: 'data' }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.get<{ id: number }>(action, {
        verify: (data) => 'id' in data,
      })

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Response does not match expected schema',
      })
    })

    test('サーバー側の関数で検証が成功した場合、データを返すこと', async () => {
      const data = { id: 1, name: 'Test User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.get<typeof data>(action, {
        verify: (response) => 'id' in response && 'name' in response,
      })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data,
      })
    })
  })

  describe('post', () => {
    test('指定したアドレスに情報を送信すること', async () => {
      const request = { name: 'New User' }
      const data = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.post<typeof data>('/users', request)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: data,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        }),
      )
    })

    test('bodyがnullの場合、正常に送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.post('/users', null)

      expect(response.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        }),
      )
    })

    test('bodyがundefinedの場合、正常に送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.post('/users', undefined)

      expect(response.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    test('bodyが空オブジェクトの場合、正常に送信すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.post('/users', {})

      expect(response.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      )
    })

    test('サーバー側の関数で情報を送信すること', async () => {
      const data = { id: 1, name: 'Test User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(data), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.post<typeof data>(action)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: data,
      })
      expect(action).toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('サーバー側の関数がエラーをスローした場合、Failedを返すこと', async () => {
      const action = vi.fn(async () => {
        throw new Error('Database error')
      })

      const http = server()
      const response = await http.post(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Database error',
      })
    })
  })

  describe('put', () => {
    test('指定したアドレスの情報を更新すること', async () => {
      const request = { name: 'Updated User' }
      const data = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.put<typeof data>('/users/1', request)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(request),
        }),
      )
    })

    test('サーバー側の関数で情報を更新すること', async () => {
      const data = { id: 1, name: 'Updated User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.put<typeof data>(action)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
      expect(action).toHaveBeenCalled()
    })

    test('サーバー側の関数がエラーをスローした場合、Failedを返すこと', async () => {
      const action = vi.fn(async () => {
        throw new Error('Update failed')
      })

      const http = server()
      const response = await http.put(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Update failed',
      })
    })
  })

  describe('patch', () => {
    test('指定したアドレスの情報を部分更新すること', async () => {
      const request = { name: 'Patched User' }
      const data = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.patch<typeof data>('/users/1', request)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(request),
        }),
      )
    })

    test('サーバー側の関数で情報を部分更新すること', async () => {
      const data = { id: 1, name: 'Patched User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const response = await http.patch<typeof data>(action)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
      expect(action).toHaveBeenCalled()
    })

    test('サーバー側の関数がエラーをスローした場合、Failedを返すこと', async () => {
      const action = vi.fn(async () => {
        throw new Error('Patch failed')
      })

      const http = server()
      const response = await http.patch(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Patch failed',
      })
    })
  })

  describe('delete', () => {
    test('指定したアドレスの情報を削除すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(null, {
          status: StatusCodes.NO_CONTENT,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const response = await http.delete('/users/1')

      expect(response).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })

    test('サーバー側の関数で情報を削除すること', async () => {
      const action = vi.fn(async () => {
        return new Response(null, {
          status: StatusCodes.NO_CONTENT,
        })
      })

      const http = server()
      const response = await http.delete(action)

      expect(response).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
      expect(action).toHaveBeenCalled()
    })

    test('サーバー側の関数がエラーをスローした場合、Failedを返すこと', async () => {
      const action = vi.fn(async () => {
        throw new Error('Delete failed')
      })

      const http = server()
      const response = await http.delete(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Delete failed',
      })
    })
  })

  describe('エラーハンドリング', () => {
    test('サーバー側の関数が応答をスローした場合、処理すること', async () => {
      const action = vi.fn(async () => {
        throw new Response(null, {
          status: StatusCodes.NOT_FOUND,
        })
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: 'Not Found',
      })
    })

    test('サーバー側の関数が中断エラーをスローした場合、タイムアウトステータスを返すこと', async () => {
      const action = vi.fn(async () => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        throw error
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: 'Request Timeout',
      })
    })

    test('サーバー側の関数が文字列をスローした場合、Internal Server Errorを返すこと', async () => {
      const action = vi.fn(async () => {
        throw 'Something went wrong'
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })

    test('サーバー側の関数がnullをスローした場合、Internal Server Errorを返すこと', async () => {
      const action = vi.fn(async () => {
        throw null
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })

    test('サーバー側の関数がオブジェクトをスローした場合、Internal Server Errorを返すこと', async () => {
      const action = vi.fn(async () => {
        throw { code: 'CUSTOM_ERROR', details: 'Something failed' }
      })

      const http = server()
      const response = await http.get(action)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })
  })

  describe('オプション', () => {
    test('カスタムbaseを使用すること', async () => {
      const data = { id: 1 }
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://custom.api.com' })
      await http.get('/users')

      expect(global.fetch).toHaveBeenCalledWith('https://custom.api.com/users', expect.any(Object))
    })

    test('timeoutを指定した場合、制限時間が適用されること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('/users', { timeout: 5000 })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })

    test('カスタムヘッダーを指定した場合、ヘッダーが送信されること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('/users', { headers: { Authorization: 'Bearer token123' } })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
        }),
      )
    })

    test('認証情報設定を指定した場合、認証情報が送信されること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('/users', { credentials: 'include' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          credentials: 'include',
        }),
      )
    })
  })

  describe('エンドポイント', () => {
    test('空文字列のエンドポイントの場合、baseのみでリクエストすること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('')

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', expect.any(Object))
    })

    test('相対パスの場合、baseと連結すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('/users/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.any(Object),
      )
    })

    test('絶対URLの場合、baseを無視すること', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: StatusCodes.OK,
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      await http.get('https://other.api.com/users')

      expect(global.fetch).toHaveBeenCalledWith('https://other.api.com/users', expect.any(Object))
    })
  })
})
