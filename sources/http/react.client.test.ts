import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi } from 'vitest'
import { react, handler, converter } from './react.client'

describe('react.client.ts', () => {
  describe('react', () => {
    test('既定のオプションで通信クライアントを作成すること', () => {
      const http = react()

      expect(http).toBeDefined()
      expect(http.get).toBeDefined()
      expect(http.infinite).toBeDefined()
      expect(http.post).toBeDefined()
      expect(http.put).toBeDefined()
      expect(http.delete).toBeDefined()
      expect(http.patch).toBeDefined()
    })

    test('カスタムオプションで通信クライアントを作成すること', () => {
      const http = react({
        base: 'https://api.example.com',
        timeout: 5000,
      })

      expect(http).toBeDefined()
      expect(http.get).toBeDefined()
      expect(http.infinite).toBeDefined()
      expect(http.post).toBeDefined()
      expect(http.put).toBeDefined()
      expect(http.delete).toBeDefined()
      expect(http.patch).toBeDefined()
    })
  })

  describe('handler', () => {
    test('成功時、successコールバックを呼ぶこと', () => {
      const success = vi.fn()
      const failure = vi.fn()

      type SuccessResult = {
        success: true
        status: number
        data: { id: number; name: string }
      }
      type Variables = { id: number }

      const result: SuccessResult = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1, name: 'Test' },
      }
      const variables: Variables = { id: 1 }

      const handle = handler(success, failure)
      handle(result, variables)

      expect(success).toHaveBeenCalledWith(result, variables)
      expect(failure).not.toHaveBeenCalled()
    })

    test('失敗時、failureコールバックを呼ぶこと', () => {
      const success = vi.fn()
      const failure = vi.fn()

      type FailedResult = {
        success: false
        status: number
        message: string
      }
      type Variables = { id: number }

      const result: FailedResult = {
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Validation failed',
      }
      const variables: Variables = { id: 1 }

      const handle = handler(success, failure)
      handle(result, variables)

      expect(success).not.toHaveBeenCalled()
      expect(failure).toHaveBeenCalledWith(result, variables)
    })

    test('コールバックが指定されていなくても正常に動作すること', () => {
      type SuccessResult = {
        success: true
        status: number
        data: { id: number }
      }
      type Variables = { id: number }

      const result: SuccessResult = {
        success: true,
        status: StatusCodes.OK,
        data: { id: 1 },
      }
      const variables: Variables = { id: 1 }

      const handle = handler()

      expect(() => handle(result, variables)).not.toThrow()
    })
  })

  describe('converter', () => {
    test('変換オブジェクトが定義されていること', () => {
      expect(converter).toBeDefined()
    })

    test('query変換関数が定義されていること', () => {
      expect(converter.query).toBeDefined()
    })

    test('infinite変換関数が定義されていること', () => {
      expect(converter.infinite).toBeDefined()
    })

    test('mutation変換関数が定義されていること', () => {
      expect(converter.mutation).toBeDefined()
    })
  })
})
