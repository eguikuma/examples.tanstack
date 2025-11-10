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
  })
})
