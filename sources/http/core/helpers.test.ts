import { StatusCodes } from 'http-status-codes'
import { describe, test, expect } from 'vitest'
import { content, parse, json, callable, error, url, metadata } from './helpers'
import { VerifyError, UnsafeUrlError, InvalidMetadataError } from './errors'

describe('helpers.ts', () => {
  describe('content', () => {
    test('コンテンツがデータ形式の場合、データとして解析すること', async () => {
      const data = { name: 'test' }
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await content(response)

      expect(result).toEqual(data)
    })

    test('コンテンツがテキストの場合、テキストとして取得すること', async () => {
      const text = 'test text'
      const response = new Response(text, {
        headers: { 'Content-Type': 'text/plain' },
      })

      const result = await content(response)

      expect(result).toBe(text)
    })

    test('ステータスが204の場合、undefinedを返すこと', async () => {
      const response = new Response(null, { status: StatusCodes.NO_CONTENT })

      const result = await content(response)

      expect(result).toBeUndefined()
    })

    test('コンテンツが未指定の場合、既定でテキストとして取得すること', async () => {
      const data = { name: 'test' }
      const text = JSON.stringify(data)
      const response = new Response(text, {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/octet-stream' },
      })

      const result = await content(response)

      expect(result).toEqual(text)
    })

    test('文字セット指定を含むデータ形式の場合、データとして解析すること', async () => {
      const data = { id: 1, name: 'test' }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

      const result = await content(response)

      expect(result).toEqual(data)
    })

    test('文字セット指定を含むテキストの場合、テキストとして解析すること', async () => {
      const text = 'test text'
      const response = new Response(text, {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })

      const result = await content(response)

      expect(result).toBe(text)
    })
  })

  describe('parse', () => {
    test('成功の応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parse(response)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('エラーの応答の場合、例外をスローすること', async () => {
      const response = new Response('Not Found', {
        status: StatusCodes.NOT_FOUND,
      })

      await expect(parse(response)).rejects.toThrow()
    })

    test('検証関数が指定されていない場合、通常通り動作すること', async () => {
      const data = { id: 1, name: 'test' }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parse(response)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('検証関数が成功を返す場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parse(response, (raw) => typeof raw === 'object' && raw !== null)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('検証関数が失敗を返す場合、例外をスローすること', async () => {
      const data = { id: 1, name: null }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
        headers: { 'Content-Type': 'application/json' },
      })

      await expect(
        parse(response, (raw) => {
          if (typeof raw !== 'object' || raw === null) return false
          const typed = raw as { id: number; name: string }
          return typeof typed.name === 'string' && typed.name !== null
        }),
      ).rejects.toThrow()
    })
  })

  describe('json', () => {
    test('応答をデータ形式として解析し、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }
      const response = new Response(JSON.stringify(data), {
        status: StatusCodes.OK,
      })

      const result = await json(response)

      expect(result).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })
  })

  describe('callable', () => {
    test('関数の場合、trueを返すこと', () => {
      const func = () => Promise.resolve(new Response())

      expect(callable(func)).toBe(true)
    })

    test('関数でない場合、falseを返すこと', () => {
      expect(callable('string')).toBe(false)
      expect(callable(123)).toBe(false)
      expect(callable(null)).toBe(false)
      expect(callable(undefined)).toBe(false)
      expect(callable({})).toBe(false)
    })
  })

  describe('error', () => {
    test('応答オブジェクトの場合、失敗を示す結果を返すこと', () => {
      const response = new Response('Not Found', {
        status: StatusCodes.NOT_FOUND,
      })

      const result = error(response)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: 'Not Found',
      })
    })

    test('中断エラーの場合、タイムアウト状態を示す失敗結果を返すこと', () => {
      const thrown = new Error('The operation was aborted')
      thrown.name = 'AbortError'

      const result = error(thrown)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: 'Request Timeout',
      })
    })

    test('検証エラーの場合、サーバーエラー状態を示す失敗結果を返すこと', () => {
      const thrown = new VerifyError()

      const result = error(thrown)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Response does not match expected schema',
      })
    })

    test('エラーオブジェクトの場合、サーバーエラー状態を示す失敗結果を返すこと', () => {
      const thrown = new Error('Test error')

      const result = error(thrown)

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Test error',
      })
    })

    test('その他の型の場合、既定の失敗結果を返すこと', () => {
      const result = error('unknown error')

      expect(result).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })
  })

  describe('url', () => {
    test('通常の接続を許可すること', () => {
      expect(() => url('http://example.com')).not.toThrow()
    })

    test('安全な接続を許可すること', () => {
      expect(() => url('https://example.com')).not.toThrow()
    })

    test('ファイル接続を拒否すること', () => {
      expect(() => url('file:///etc/passwd')).toThrow(UnsafeUrlError)
    })

    test('ファイル転送接続を拒否すること', () => {
      expect(() => url('ftp://example.com')).toThrow(UnsafeUrlError)
    })

    test('ローカル環境を拒否すること', () => {
      expect(() => url('http://localhost')).toThrow(UnsafeUrlError)
    })

    test('大文字のローカル環境も拒否すること', () => {
      expect(() => url('http://LOCALHOST')).toThrow(UnsafeUrlError)
    })

    test('10.x.x.xを拒否すること', () => {
      expect(() => url('http://10.0.0.1')).toThrow(UnsafeUrlError)
      expect(() => url('http://10.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('172.16.x.x - 172.31.x.xを拒否すること', () => {
      expect(() => url('http://172.16.0.1')).toThrow(UnsafeUrlError)
      expect(() => url('http://172.31.255.255')).toThrow(UnsafeUrlError)
      expect(() => url('http://172.20.0.1')).toThrow(UnsafeUrlError)
    })

    test('172.15系のアドレスを許可すること', () => {
      expect(() => url('http://172.15.255.255')).not.toThrow()
    })

    test('172.32系のアドレスを許可すること', () => {
      expect(() => url('http://172.32.0.1')).not.toThrow()
    })

    test('192.168.x.xを拒否すること', () => {
      expect(() => url('http://192.168.0.1')).toThrow(UnsafeUrlError)
      expect(() => url('http://192.168.255.255')).toThrow(UnsafeUrlError)
    })

    test('127.x.x.xを拒否すること', () => {
      expect(() => url('http://127.0.0.1')).toThrow(UnsafeUrlError)
      expect(() => url('http://127.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('169.254.x.xを拒否すること', () => {
      expect(() => url('http://169.254.0.1')).toThrow(UnsafeUrlError)
      expect(() => url('http://169.254.255.255')).toThrow(UnsafeUrlError)
    })

    test('0.x.x.xを拒否すること', () => {
      expect(() => url('http://0.0.0.0')).toThrow(UnsafeUrlError)
      expect(() => url('http://0.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('8.8.8.8を許可すること', () => {
      expect(() => url('http://8.8.8.8')).not.toThrow()
    })

    test('1.1.1.1を許可すること', () => {
      expect(() => url('http://1.1.1.1')).not.toThrow()
    })

    test('93.184.216.34を許可すること', () => {
      expect(() => url('http://93.184.216.34')).not.toThrow()
    })

    test('::1を拒否すること', () => {
      expect(() => url('http://[::1]')).toThrow(UnsafeUrlError)
    })

    test('::を拒否すること', () => {
      expect(() => url('http://[::]')).toThrow(UnsafeUrlError)
    })

    test('fe80::で始まるアドレスを拒否すること', () => {
      expect(() => url('http://[fe80::1]')).toThrow(UnsafeUrlError)
      expect(() => url('http://[fe80::abcd:1234]')).toThrow(UnsafeUrlError)
    })

    test('fcで始まるアドレスを拒否すること', () => {
      expect(() => url('http://[fc00::1]')).toThrow(UnsafeUrlError)
    })

    test('fdで始まるアドレスを拒否すること', () => {
      expect(() => url('http://[fd00::1]')).toThrow(UnsafeUrlError)
    })

    test('外部の次世代ネットワークアドレスを許可すること', () => {
      expect(() => url('http://[2001:4860:4860::8888]')).not.toThrow()
    })

    test('正常なドメイン名を許可すること', () => {
      expect(() => url('https://example.com')).not.toThrow()
      expect(() => url('https://api.example.com')).not.toThrow()
    })

    test('ポート番号付きアドレスを許可すること', () => {
      expect(() => url('https://example.com:8080')).not.toThrow()
    })

    test('パス付きアドレスを許可すること', () => {
      expect(() => url('https://example.com/api/users')).not.toThrow()
    })

    test('クエリパラメータ付きアドレスを許可すること', () => {
      expect(() => url('https://example.com/api?key=value')).not.toThrow()
    })

    test('unsafe: trueの場合、ローカル環境を許可すること', () => {
      expect(() => url('http://localhost', true)).not.toThrow()
      expect(() => url('http://localhost:3000', true)).not.toThrow()
    })

    test('unsafe: trueの場合、内部ネットワークを許可すること', () => {
      expect(() => url('http://127.0.0.1', true)).not.toThrow()
      expect(() => url('http://192.168.1.1', true)).not.toThrow()
      expect(() => url('http://10.0.0.1', true)).not.toThrow()
    })

    test('unsafe: trueの場合、次世代プロトコルのループバックを許可すること', () => {
      expect(() => url('http://[::1]', true)).not.toThrow()
    })

    test('unsafe: falseの場合、セキュリティチェックを実行すること', () => {
      expect(() => url('http://localhost', false)).toThrow(UnsafeUrlError)
    })

    test('unsafeが未指定の場合、セキュリティチェックを実行すること', () => {
      expect(() => url('http://localhost')).toThrow(UnsafeUrlError)
    })
  })

  describe('metadata', () => {
    test('空のオブジェクトの場合、エラーをスローしないこと', () => {
      expect(() => metadata({})).not.toThrow()
    })

    test('ASCII文字のみの場合、エラーをスローしないこと', () => {
      expect(() => metadata({ key: 'value', name: 'test' })).not.toThrow()
    })

    test('ISO-8859-1の範囲内の文字の場合、エラーをスローしないこと', () => {
      expect(() => metadata({ header: 'àéîöü' })).not.toThrow()
    })

    test('境界値（charCode 255）の場合、エラーをスローしないこと', () => {
      const char255 = String.fromCharCode(255)
      expect(() => metadata({ header: char255 })).not.toThrow()
    })

    test('境界値（charCode 256）の場合、InvalidMetadataErrorをスローすること', () => {
      const char256 = String.fromCharCode(256)
      expect(() => metadata({ header: char256 })).toThrow(InvalidMetadataError)
    })

    test('日本語文字の場合、InvalidMetadataErrorをスローすること', () => {
      expect(() => metadata({ header: 'テスト' })).toThrow(InvalidMetadataError)
    })

    test('絵文字の場合、InvalidMetadataErrorをスローすること', () => {
      expect(() => metadata({ header: '🎉' })).toThrow(InvalidMetadataError)
    })

    test('複数の値があり全て有効な場合、エラーをスローしないこと', () => {
      expect(() =>
        metadata({
          key1: 'value1',
          key2: 'value2',
          key3: 'test',
        }),
      ).not.toThrow()
    })

    test('複数の値があり一つでも無効な場合、InvalidMetadataErrorをスローすること', () => {
      expect(() =>
        metadata({
          key1: 'value1',
          key2: 'テスト',
          key3: 'test',
        }),
      ).toThrow(InvalidMetadataError)
    })
  })
})
