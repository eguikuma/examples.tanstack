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
      const result = await http.get<typeof data>('/users/1')

      expect(result).toEqual({
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
      const result = await http.get<typeof data>(action)

      expect(result).toEqual({
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
      const result = await http.get(action)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Network error',
      })
    })
  })

  describe('post', () => {
    test('指定したアドレスに情報を送信すること', async () => {
      const request = { name: 'New User' }
      const response = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const result = await http.post<typeof response>('/users', request)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: response,
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        }),
      )
    })

    test('サーバー側の関数で情報を送信すること', async () => {
      const response = { id: 1, name: 'Test User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(response), {
          status: StatusCodes.CREATED,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const result = await http.post<typeof response>(action)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.CREATED,
        data: response,
      })
      expect(action).toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('put', () => {
    test('指定したアドレスの情報を更新すること', async () => {
      const request = { name: 'Updated User' }
      const response = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const result = await http.put<typeof response>('/users/1', request)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: response,
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
      const response = { id: 1, name: 'Updated User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(response), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const result = await http.put<typeof response>(action)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: response,
      })
      expect(action).toHaveBeenCalled()
    })
  })

  describe('patch', () => {
    test('指定したアドレスの情報を部分更新すること', async () => {
      const request = { name: 'Patched User' }
      const response = { id: 1, ...request }

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://api.example.com' })
      const result = await http.patch<typeof response>('/users/1', request)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: response,
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
      const response = { id: 1, name: 'Patched User' }
      const action = vi.fn(async () => {
        return new Response(JSON.stringify(response), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const http = server()
      const result = await http.patch<typeof response>(action)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: response,
      })
      expect(action).toHaveBeenCalled()
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
      const result = await http.delete('/users/1')

      expect(result).toEqual({
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
      const result = await http.delete(action)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
      expect(action).toHaveBeenCalled()
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
      const result = await http.get(action)

      expect(result).toEqual({
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
      const result = await http.get(action)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: 'Request Timeout',
      })
    })
  })

  describe('オプション', () => {
    test('カスタムbaseを使用すること', async () => {
      const data = { id: 1 }
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const http = server({ base: 'https://custom.api.com' })
      await http.get('/users')

      expect(global.fetch).toHaveBeenCalledWith('https://custom.api.com/users', expect.any(Object))
    })
  })
})
