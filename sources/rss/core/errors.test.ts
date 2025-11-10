import { describe, test, expect } from 'vitest'

import { ParseError } from './errors'

describe('errors.ts', () => {
  describe('ParseError', () => {
    test('エラーの名前がParseErrorであること', () => {
      const error = new ParseError()

      expect(error.name).toBe('ParseError')
    })

    test('エラーメッセージが解析失敗を示すこと', () => {
      const error = new ParseError()

      expect(error.message).toBe('RSS parse is failed')
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new ParseError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ParseError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new ParseError()
      }).toThrow(ParseError)
    })

    test('型ガードで識別できること', () => {
      const error = new ParseError()

      expect(error instanceof ParseError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    test('元のエラーを渡した場合、エラー連鎖情報を保持すること', () => {
      const original = new Error('Original error message')
      const error = new ParseError(original)

      expect(error.cause).toBe(original)
    })

    test('文字列を渡した場合、原因情報として設定されること', () => {
      const message = 'Custom error reason'
      const error = new ParseError(message)

      expect(error.cause).toBe(message)
    })

    test('オブジェクトを渡した場合、原因情報として設定されること', () => {
      const details = { code: 'PARSE_FAILED', details: 'Invalid XML' }
      const error = new ParseError(details)

      expect(error.cause).toBe(details)
    })

    test('数値を渡した場合、原因情報として設定されること', () => {
      const code = 0
      const error = new ParseError(code)

      expect(error.cause).toBe(code)
    })

    test('nullを渡した場合、原因情報として設定されること', () => {
      const error = new ParseError(null)

      expect(error.cause).toBe(null)
    })

    test('引数を省略した場合、原因情報が未定義であること', () => {
      const error = new ParseError()

      expect(error.cause).toBeUndefined()
    })

    test('スタックトレースを持つこと', () => {
      const error = new ParseError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })

    test('元のエラーを渡した場合、元のエラー情報を保持すること', () => {
      const original = new Error('XML syntax error')
      const error = new ParseError(original)

      expect(error.cause).toBeInstanceOf(Error)
      expect((error.cause as Error).message).toBe('XML syntax error')
    })

    test('元のエラーを渡した場合、元のエラーメッセージにアクセスできること', () => {
      const original = new Error('Malformed feed')
      const error = new ParseError(original)

      expect((error.cause as Error).message).toBe('Malformed feed')
    })

    test('複数のインスタンスが互いに干渉しないこと', () => {
      const error1 = new ParseError('Reason 1')
      const error2 = new ParseError('Reason 2')

      expect(error1.cause).toBe('Reason 1')
      expect(error2.cause).toBe('Reason 2')
      expect(error1).not.toBe(error2)
    })

    test('エラーメッセージが不変であること', () => {
      const error = new ParseError()
      const original = error.message

      expect(error.message).toBe('RSS parse is failed')
      expect(error.message).toBe(original)
    })

    test('原因情報が未定義の場合、アクセスしてもエラーにならないこと', () => {
      const error = new ParseError()

      expect(() => error.cause).not.toThrow()
      expect(error.cause).toBeUndefined()
    })
  })
})
