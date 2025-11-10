import { describe, test, expect } from 'vitest'
import { UrlTooLongError, InvalidUrlError, VerifyError, UnsafeUrlError } from './errors'

describe('errors.ts', () => {
  describe('UrlTooLongError', () => {
    test('エラーの名前がUrlTooLongErrorであること', () => {
      const error = new UrlTooLongError()

      expect(error.name).toBe('UrlTooLongError')
    })

    test('エラーメッセージが最大文字数超過を示すこと', () => {
      const error = new UrlTooLongError()

      expect(error.message).toBe('URL exceeds maximum length of 2083 characters')
    })

    test('MaxLength定数が2083であること', () => {
      expect(UrlTooLongError.MaxLength).toBe(2083)
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new UrlTooLongError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(UrlTooLongError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new UrlTooLongError()
      }).toThrow(UrlTooLongError)
    })

    test('型ガードで識別できること', () => {
      const error = new UrlTooLongError()

      expect(error instanceof UrlTooLongError).toBe(true)
      expect(error instanceof InvalidUrlError).toBe(false)
    })
  })

  describe('InvalidUrlError', () => {
    test('エラーの名前がInvalidUrlErrorであること', () => {
      const error = new InvalidUrlError()

      expect(error.name).toBe('InvalidUrlError')
    })

    test('エラーメッセージが構文エラーを示すこと', () => {
      const error = new InvalidUrlError()

      expect(error.message).toBe('URL syntax is invalid')
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new InvalidUrlError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(InvalidUrlError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new InvalidUrlError()
      }).toThrow(InvalidUrlError)
    })

    test('型ガードで識別できること', () => {
      const error = new InvalidUrlError()

      expect(error instanceof InvalidUrlError).toBe(true)
      expect(error instanceof UrlTooLongError).toBe(false)
    })
  })

  describe('VerifyError', () => {
    test('エラーの名前がVerifyErrorであること', () => {
      const error = new VerifyError()

      expect(error.name).toBe('VerifyError')
    })

    test('エラーメッセージがスキーマ不一致を示すこと', () => {
      const error = new VerifyError()

      expect(error.message).toBe('Response does not match expected schema')
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new VerifyError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(VerifyError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new VerifyError()
      }).toThrow(VerifyError)
    })

    test('型ガードで識別できること', () => {
      const error = new VerifyError()

      expect(error instanceof VerifyError).toBe(true)
      expect(error instanceof UrlTooLongError).toBe(false)
      expect(error instanceof InvalidUrlError).toBe(false)
    })
  })

  describe('UnsafeUrlError', () => {
    test('エラーの名前がUnsafeUrlErrorであること', () => {
      const error = new UnsafeUrlError()

      expect(error.name).toBe('UnsafeUrlError')
    })

    test('エラーメッセージが安全でないことを示すこと', () => {
      const error = new UnsafeUrlError()

      expect(error.message).toBe('URL is not safe for external requests')
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new UnsafeUrlError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(UnsafeUrlError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new UnsafeUrlError()
      }).toThrow(UnsafeUrlError)
    })

    test('型ガードで識別できること', () => {
      const error = new UnsafeUrlError()

      expect(error instanceof UnsafeUrlError).toBe(true)
      expect(error instanceof UrlTooLongError).toBe(false)
      expect(error instanceof InvalidUrlError).toBe(false)
      expect(error instanceof VerifyError).toBe(false)
    })
  })
})
