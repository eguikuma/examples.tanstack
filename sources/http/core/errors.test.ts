import { describe, test, expect } from 'vitest'

import {
  UrlTooLongError,
  InvalidUrlError,
  VerifyError,
  UnsafeUrlError,
  InvalidMetadataError,
} from './errors'

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

    test('スタックトレースを持つこと', () => {
      const error = new UrlTooLongError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('UrlTooLongError')
    })

    test('エラーメッセージが不変であること', () => {
      const error = new UrlTooLongError()
      const original = error.message

      expect(error.message).toBe(original)
      expect(error.message).toBe('URL exceeds maximum length of 2083 characters')
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

    test('スタックトレースを持つこと', () => {
      const error = new InvalidUrlError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('InvalidUrlError')
    })

    test('エラーメッセージが不変であること', () => {
      const error = new InvalidUrlError()
      const original = error.message

      expect(error.message).toBe(original)
      expect(error.message).toBe('URL syntax is invalid')
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

    test('スタックトレースを持つこと', () => {
      const error = new VerifyError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('VerifyError')
    })

    test('エラーメッセージが不変であること', () => {
      const error = new VerifyError()
      const original = error.message

      expect(error.message).toBe(original)
      expect(error.message).toBe('Response does not match expected schema')
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

    test('スタックトレースを持つこと', () => {
      const error = new UnsafeUrlError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('UnsafeUrlError')
    })

    test('エラーメッセージが不変であること', () => {
      const error = new UnsafeUrlError()
      const original = error.message

      expect(error.message).toBe(original)
      expect(error.message).toBe('URL is not safe for external requests')
    })
  })

  describe('InvalidMetadataError', () => {
    test('エラーの名前がInvalidMetadataErrorであること', () => {
      const error = new InvalidMetadataError()

      expect(error.name).toBe('InvalidMetadataError')
    })

    test('エラーメッセージが非ISO-8859-1文字を示すこと', () => {
      const error = new InvalidMetadataError()

      expect(error.message).toBe('Request metadata contains non-ISO-8859-1 characters')
    })

    test('エラーオブジェクトのインスタンスであること', () => {
      const error = new InvalidMetadataError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(InvalidMetadataError)
    })

    test('スローして捕捉できること', () => {
      expect(() => {
        throw new InvalidMetadataError()
      }).toThrow(InvalidMetadataError)
    })

    test('型ガードで識別できること', () => {
      const error = new InvalidMetadataError()

      expect(error instanceof InvalidMetadataError).toBe(true)
      expect(error instanceof UrlTooLongError).toBe(false)
    })

    test('すべてのエラーと区別できること', () => {
      const error = new InvalidMetadataError()

      expect(error instanceof InvalidMetadataError).toBe(true)
      expect(error instanceof UrlTooLongError).toBe(false)
      expect(error instanceof InvalidUrlError).toBe(false)
      expect(error instanceof VerifyError).toBe(false)
      expect(error instanceof UnsafeUrlError).toBe(false)
    })

    test('スタックトレースを持つこと', () => {
      const error = new InvalidMetadataError()

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('InvalidMetadataError')
    })

    test('エラーメッセージが不変であること', () => {
      const error = new InvalidMetadataError()
      const original = error.message

      expect(error.message).toBe(original)
      expect(error.message).toBe('Request metadata contains non-ISO-8859-1 characters')
    })
  })
})
