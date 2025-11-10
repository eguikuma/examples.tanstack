import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { captor } from './captor'
import type { RequestContext } from '../models'

describe('captor.ts', () => {
  let context: RequestContext

  beforeEach(() => {
    context = {
      method: 'GET',
      endpoint: '/api/users',
      options: {},
    }
  })

  describe('応答エラー', () => {
    test('データ形式の応答の場合、エラー内容を解析すること', async () => {
      const response = new Response(
        JSON.stringify({
          message: 'Validation failed',
          issues: { email: ['Invalid email'] },
        }),
        {
          status: StatusCodes.BAD_REQUEST,
          headers: { 'Content-Type': 'application/json' },
        },
      )

      const interceptor = captor()
      const result = await interceptor(response, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Validation failed',
        issues: { email: ['Invalid email'] },
      })
    })

    test('データ形式以外の応答の場合、既定のメッセージを使用すること', async () => {
      const response = new Response('Not Found', {
        status: StatusCodes.NOT_FOUND,
      })

      const interceptor = captor()
      const result = await interceptor(response, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: 'Not Found',
      })
    })

    test('応答本文が既に消費されている場合、既定のメッセージを使用すること', async () => {
      const response = new Response(
        JSON.stringify({
          message: 'Server Error',
        }),
        {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          headers: { 'Content-Type': 'application/json' },
        },
      )

      await response.json()

      const interceptor = captor()
      const result = await interceptor(response, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })
  })

  describe('Errorオブジェクト', () => {
    test('エラーオブジェクトの場合、サーバーエラーステータスを返すこと', async () => {
      const thrown = new Error('Network error')

      const interceptor = captor()
      const result = await interceptor(thrown, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Network error',
      })
    })

    test('メッセージがないErrorの場合、既定のメッセージを使用すること', async () => {
      const thrown = new Error()

      const interceptor = captor()
      const result = await interceptor(thrown, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })

    test('中断エラーの場合、タイムアウトステータスを返すこと', async () => {
      const thrown = new Error('The operation was aborted')
      thrown.name = 'AbortError'

      const interceptor = captor()
      const result = await interceptor(thrown, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: 'Request Timeout',
      })
    })
  })

  describe('その他のエラー', () => {
    test('未知のエラータイプの場合、既定のエラーを返すこと', async () => {
      const thrown = 'Something went wrong'

      const interceptor = captor()
      const result = await interceptor(thrown, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })
  })

  describe('コールバック', () => {
    test('401エラーの場合、unauthorizedコールバックを呼ぶこと', async () => {
      const handler = vi.fn()
      const fallback = vi.fn()

      const response = new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: StatusCodes.UNAUTHORIZED,
        headers: { 'Content-Type': 'application/json' },
      })

      const interceptor = captor({
        unauthorized: handler,
        failure: fallback,
      })

      await interceptor(response, context)

      expect(handler).toHaveBeenCalledWith({
        success: false,
        status: StatusCodes.UNAUTHORIZED,
        message: 'Unauthorized',
      })
      expect(fallback).not.toHaveBeenCalled()
    })

    test('401以外のエラーの場合、failureコールバックを呼ぶこと', async () => {
      const handler = vi.fn()
      const fallback = vi.fn()

      const response = new Response(JSON.stringify({ message: 'Bad Request' }), {
        status: StatusCodes.BAD_REQUEST,
        headers: { 'Content-Type': 'application/json' },
      })

      const interceptor = captor({
        unauthorized: handler,
        failure: fallback,
      })

      await interceptor(response, context)

      expect(handler).not.toHaveBeenCalled()
      expect(fallback).toHaveBeenCalledWith({
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Bad Request',
      })
    })

    test('コールバックが指定されていなくても正常に動作すること', async () => {
      const response = new Response(JSON.stringify({ message: 'Error' }), {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: { 'Content-Type': 'application/json' },
      })

      const interceptor = captor()
      const result = await interceptor(response, context)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Error',
      })
    })
  })
})
