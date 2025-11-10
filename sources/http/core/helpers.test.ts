import { StatusCodes } from 'http-status-codes'
import { describe, test, expect } from 'vitest'

import { VerifyError, UnsafeUrlError, InvalidMetadataError } from './errors'
import { assertMetadata, assertUrl, failify, isFunction, outcomify, unwrap } from './helpers'

describe('helpers.ts', () => {
  describe('unwrap', () => {
    test('コンテンツがデータ形式の場合、データとして解析すること', async () => {
      const data = { name: 'test' }

      const response = await unwrap(
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      expect(response).toEqual(data)
    })

    test('コンテンツがテキストの場合、テキストとして取得すること', async () => {
      const text = 'test text'

      const response = await unwrap(
        new Response(text, {
          headers: { 'Content-Type': 'text/plain' },
        }),
      )

      expect(response).toBe(text)
    })

    test('ステータスが204の場合、undefinedを返すこと', async () => {
      const response = await unwrap(new Response(null, { status: StatusCodes.NO_CONTENT }))

      expect(response).toBeUndefined()
    })

    test('コンテンツが未指定の場合、既定でテキストとして取得すること', async () => {
      const data = { name: 'test' }
      const text = JSON.stringify(data)

      const response = await unwrap(
        new Response(text, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      )

      expect(response).toEqual(text)
    })

    test('Content-Typeヘッダーが存在しない場合、テキストとして取得すること', async () => {
      const text = 'plain text'

      const response = await unwrap(new Response(text, { status: StatusCodes.OK }))

      expect(response).toBe(text)
    })

    test('複数のパラメータを含むデータ形式の場合、データとして解析すること', async () => {
      const data = { id: 1 }

      const response = await unwrap(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json; charset=utf-8; boundary=something' },
        }),
      )

      expect(response).toEqual(data)
    })

    test('204以外で送信内容が空の場合、空文字列を返すこと', async () => {
      const response = await unwrap(
        new Response('', {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )

      expect(response).toBe('')
    })

    test('文字セット指定を含むデータ形式の場合、データとして解析すること', async () => {
      const data = { id: 1, name: 'test' }

      const response = await unwrap(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      )

      expect(response).toEqual(data)
    })

    test('文字セット指定を含むテキストの場合、テキストとして解析すること', async () => {
      const text = 'test text'

      const response = await unwrap(
        new Response(text, {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
      )

      expect(response).toBe(text)
    })
  })

  describe('outcomify', () => {
    test('成功の応答の場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }

      const response = await outcomify(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('204ステータスの場合、undefinedをデータとして返すこと', async () => {
      const response = await outcomify(new Response(null, { status: StatusCodes.NO_CONTENT }))

      expect(response).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
    })

    test('検証関数が指定されていない場合、通常通り動作すること', async () => {
      const data = { id: 1, name: 'test' }

      const response = await outcomify(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('検証関数が成功を返す場合、成功を示す結果を返すこと', async () => {
      const data = { id: 1, name: 'test' }

      const response = await outcomify(
        new Response(JSON.stringify(data), {
          status: StatusCodes.OK,
          headers: { 'Content-Type': 'application/json' },
        }),
        (raw) => typeof raw === 'object' && raw !== null,
      )

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: data,
      })
    })

    test('検証関数が失敗を返す場合、例外をスローすること', async () => {
      const data = { id: 1, name: null }

      await expect(
        outcomify(
          new Response(JSON.stringify(data), {
            status: StatusCodes.OK,
          }),
          (raw) => {
            if (typeof raw !== 'object' || raw === null) return false
            const typed = raw as { id: number; name: string }
            return typeof typed.name === 'string' && typed.name !== null
          },
        ),
      ).rejects.toThrow()
    })

    test('検証関数が例外をスローした場合、その例外を伝播すること', async () => {
      await expect(
        outcomify(
          new Response(JSON.stringify({ id: 1 }), {
            status: StatusCodes.OK,
          }),
          () => {
            throw new Error('Custom validation error')
          },
        ),
      ).rejects.toThrow('Custom validation error')
    })
  })

  describe('failify', () => {
    test('応答オブジェクトの場合、失敗を示す結果を返すこと', async () => {
      const response = await failify(
        new Response('Not Found', {
          status: StatusCodes.NOT_FOUND,
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: 'Not Found',
      })
    })

    test('中断エラーの場合、タイムアウト状態を示す失敗結果を返すこと', async () => {
      const thrown = new Error('The operation was aborted')
      thrown.name = 'AbortError'

      const response = await failify(thrown)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: 'Request Timeout',
      })
    })

    test('検証エラーの場合、サーバーエラー状態を示す失敗結果を返すこと', async () => {
      const thrown = new VerifyError()

      const response = await failify(thrown)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Response does not match expected schema',
      })
    })

    test('エラーオブジェクトの場合、サーバーエラー状態を示す失敗結果を返すこと', async () => {
      const thrown = new Error('Test error')

      const response = await failify(thrown)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Test error',
      })
    })

    test('検証エラーが固定のメッセージを返すこと', async () => {
      const thrown = new VerifyError()

      const response = await failify(thrown)

      if (!response.success) {
        expect(response.message).toBe('Response does not match expected schema')
      }
    })

    test('その他の型の場合、既定の失敗結果を返すこと', async () => {
      const response = await failify('unknown error')

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
    })

    test('JSONレスポンスのmessageフィールドを抽出すること', async () => {
      const response = await failify(
        new Response(JSON.stringify({ message: 'Custom error message' }), {
          status: StatusCodes.BAD_REQUEST,
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: 'Custom error message',
        body: { message: 'Custom error message' },
      })
    })

    test('JSONレスポンスのbodyフィールドに完全なレスポンスを格納すること', async () => {
      const body = {
        message: 'Validation failed',
        errors: ['Field1 is required', 'Field2 is invalid'],
      }

      const response = await failify(
        new Response(JSON.stringify(body), {
          status: StatusCodes.UNPROCESSABLE_ENTITY,
        }),
      )

      if (!response.success) {
        expect(response.body).toEqual(body)
      }
    })

    test('JSONパース失敗時にフォールバック処理を行うこと', async () => {
      const response = await failify(
        new Response('Invalid JSON {', {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      })
      if (!response.success) {
        expect(response.body).toBeUndefined()
      }
    })
  })

  describe('assertUrl', () => {
    test('通常の接続を許可すること', () => {
      expect(() => assertUrl('http://example.com')).not.toThrow()
    })

    test('安全な接続を許可すること', () => {
      expect(() => assertUrl('https://example.com')).not.toThrow()
    })

    test('ファイル接続を拒否すること', () => {
      expect(() => assertUrl('file:///etc/passwd')).toThrow(UnsafeUrlError)
    })

    test('ファイル転送接続を拒否すること', () => {
      expect(() => assertUrl('ftp://example.com')).toThrow(UnsafeUrlError)
    })

    test('ローカル環境を拒否すること', () => {
      expect(() => assertUrl('http://localhost')).toThrow(UnsafeUrlError)
    })

    test('大文字のローカル環境も拒否すること', () => {
      expect(() => assertUrl('http://LOCALHOST')).toThrow(UnsafeUrlError)
    })

    test('10.x.x.xを拒否すること', () => {
      expect(() => assertUrl('http://10.0.0.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://10.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('172.16.x.x - 172.31.x.xを拒否すること', () => {
      expect(() => assertUrl('http://172.16.0.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://172.31.255.255')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://172.20.0.1')).toThrow(UnsafeUrlError)
    })

    test('172.15系のアドレスを許可すること', () => {
      expect(() => assertUrl('http://172.15.255.255')).not.toThrow()
    })

    test('172.32系のアドレスを許可すること', () => {
      expect(() => assertUrl('http://172.32.0.1')).not.toThrow()
    })

    test('192.168.x.xを拒否すること', () => {
      expect(() => assertUrl('http://192.168.0.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://192.168.255.255')).toThrow(UnsafeUrlError)
    })

    test('127.x.x.xを拒否すること', () => {
      expect(() => assertUrl('http://127.0.0.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://127.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('169.254.x.xを拒否すること', () => {
      expect(() => assertUrl('http://169.254.0.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://169.254.255.255')).toThrow(UnsafeUrlError)
    })

    test('0.x.x.xを拒否すること', () => {
      expect(() => assertUrl('http://0.0.0.0')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://0.255.255.255')).toThrow(UnsafeUrlError)
    })

    test('8.8.8.8を許可すること', () => {
      expect(() => assertUrl('http://8.8.8.8')).not.toThrow()
    })

    test('1.1.1.1を許可すること', () => {
      expect(() => assertUrl('http://1.1.1.1')).not.toThrow()
    })

    test('93.184.216.34を許可すること', () => {
      expect(() => assertUrl('http://93.184.216.34')).not.toThrow()
    })

    test('ゼロ埋めされたアドレスを拒否すること', () => {
      expect(() => assertUrl('http://192.168.001.001')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://127.000.000.001')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://10.00.00.01')).toThrow(UnsafeUrlError)
    })

    test('範囲外の値を持つ第4版アドレスを拒否すること', () => {
      expect(() => assertUrl('http://192.168.1.256')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://300.1.1.1')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://1.1.1.999')).toThrow(UnsafeUrlError)
    })

    test('::1を拒否すること', () => {
      expect(() => assertUrl('http://[::1]')).toThrow(UnsafeUrlError)
    })

    test('::を拒否すること', () => {
      expect(() => assertUrl('http://[::]')).toThrow(UnsafeUrlError)
    })

    test('fe80::で始まるアドレスを拒否すること', () => {
      expect(() => assertUrl('http://[fe80::1]')).toThrow(UnsafeUrlError)
      expect(() => assertUrl('http://[fe80::abcd:1234]')).toThrow(UnsafeUrlError)
    })

    test('fcで始まるアドレスを拒否すること', () => {
      expect(() => assertUrl('http://[fc00::1]')).toThrow(UnsafeUrlError)
    })

    test('fdで始まるアドレスを拒否すること', () => {
      expect(() => assertUrl('http://[fd00::1]')).toThrow(UnsafeUrlError)
    })

    test('外部の次世代ネットワークアドレスを許可すること', () => {
      expect(() => assertUrl('http://[2001:4860:4860::8888]')).not.toThrow()
    })

    test('大文字を含む次世代ネットワークアドレスを正規化して検証すること', () => {
      expect(() => assertUrl('http://[2001:4860:4860::AAAA]')).not.toThrow()
      expect(() => assertUrl('http://[2001:DB8::1]')).not.toThrow()
      expect(() => assertUrl('http://[FE80::1]')).toThrow(UnsafeUrlError)
    })

    test('省略形の次世代ネットワークアドレスを許可すること', () => {
      expect(() => assertUrl('http://[2001:db8::1]')).not.toThrow()
      expect(() => assertUrl('http://[2001:db8:0:0:0:0:0:1]')).not.toThrow()
    })

    test('ポート番号付きの次世代ネットワークアドレスを許可すること', () => {
      expect(() => assertUrl('http://[2001:4860:4860::8888]:8080')).not.toThrow()
      expect(() => assertUrl('http://[::1]:3000', true)).not.toThrow()
    })

    test('正常なドメイン名を許可すること', () => {
      expect(() => assertUrl('https://example.com')).not.toThrow()
      expect(() => assertUrl('https://api.example.com')).not.toThrow()
    })

    test('ポート番号付きアドレスを許可すること', () => {
      expect(() => assertUrl('https://example.com:8080')).not.toThrow()
    })

    test('パス付きアドレスを許可すること', () => {
      expect(() => assertUrl('https://example.com/api/users')).not.toThrow()
    })

    test('クエリパラメータ付きアドレスを許可すること', () => {
      expect(() => assertUrl('https://example.com/api?key=value')).not.toThrow()
    })

    test('複数のスラッシュを含むパスを許可すること', () => {
      expect(() => assertUrl('https://example.com/api//users')).not.toThrow()
    })

    test('フラグメントを含むアドレスを許可すること', () => {
      expect(() => assertUrl('https://example.com/page#section')).not.toThrow()
    })

    test('unsafeの場合、ローカル環境を許可すること', () => {
      expect(() => assertUrl('http://localhost', true)).not.toThrow()
      expect(() => assertUrl('http://localhost:3000', true)).not.toThrow()
    })

    test('unsafeの場合、内部ネットワークを許可すること', () => {
      expect(() => assertUrl('http://127.0.0.1', true)).not.toThrow()
      expect(() => assertUrl('http://192.168.1.1', true)).not.toThrow()
      expect(() => assertUrl('http://10.0.0.1', true)).not.toThrow()
    })

    test('unsafeの場合、次世代プロトコルのループバックを許可すること', () => {
      expect(() => assertUrl('http://[::1]', true)).not.toThrow()
    })

    test('localhostパラメータの場合、次世代ネットワークのループバックを許可すること', () => {
      expect(() => assertUrl('http://[::1]', false, true)).not.toThrow()
    })

    test('unsafeでもファイル接続を拒否すること', () => {
      expect(() => assertUrl('file:///etc/passwd', true)).toThrow(UnsafeUrlError)
    })

    test('unsafeでもスクリプト実行を拒否すること', () => {
      expect(() => assertUrl('javascript:alert(1)', true)).toThrow(UnsafeUrlError)
    })

    test('unsafeでもデータ接続を拒否すること', () => {
      expect(() => assertUrl('data:text/html,<script>alert(1)</script>', true)).toThrow(
        UnsafeUrlError,
      )
    })

    test('unsafeでない場合、セキュリティチェックを実行すること', () => {
      expect(() => assertUrl('http://localhost', false)).toThrow(UnsafeUrlError)
    })

    test('unsafeが未指定の場合、セキュリティチェックを実行すること', () => {
      expect(() => assertUrl('http://localhost')).toThrow(UnsafeUrlError)
    })
  })

  describe('assertMetadata', () => {
    test('空のオブジェクトの場合、エラーをスローしないこと', () => {
      expect(() => assertMetadata({})).not.toThrow()
    })

    test('ASCII文字のみの場合、エラーをスローしないこと', () => {
      expect(() => assertMetadata({ key: 'value', name: 'test' })).not.toThrow()
    })

    test('ISO-8859-1の範囲内の文字の場合、エラーをスローしないこと', () => {
      expect(() => assertMetadata({ header: 'àéîöü' })).not.toThrow()
    })

    test('境界値（=255）の場合、エラーをスローしないこと', () => {
      const char255 = String.fromCharCode(255)
      expect(() => assertMetadata({ header: char255 })).not.toThrow()
    })

    test('境界値（=32、=126）の場合、エラーをスローしないこと', () => {
      expect(() => assertMetadata({ header: ' ' })).not.toThrow()
      expect(() => assertMetadata({ header: '~' })).not.toThrow()
    })

    test('制御文字の場合、InvalidMetadataErrorをスローすること', () => {
      expect(() => assertMetadata({ header: String.fromCharCode(0) })).toThrow(InvalidMetadataError)
      expect(() => assertMetadata({ header: String.fromCharCode(9) })).toThrow(InvalidMetadataError)
      expect(() => assertMetadata({ header: String.fromCharCode(10) })).toThrow(
        InvalidMetadataError,
      )
      expect(() => assertMetadata({ header: String.fromCharCode(31) })).toThrow(
        InvalidMetadataError,
      )
      expect(() => assertMetadata({ header: String.fromCharCode(127) })).toThrow(
        InvalidMetadataError,
      )
    })

    test('境界値（=256）の場合、InvalidMetadataErrorをスローすること', () => {
      const char256 = String.fromCharCode(256)
      expect(() => assertMetadata({ header: char256 })).toThrow(InvalidMetadataError)
    })

    test('日本語文字の場合、InvalidMetadataErrorをスローすること', () => {
      expect(() => assertMetadata({ header: 'テスト' })).toThrow(InvalidMetadataError)
    })

    test('絵文字の場合、InvalidMetadataErrorをスローすること', () => {
      expect(() => assertMetadata({ header: '🎉' })).toThrow(InvalidMetadataError)
    })

    test('複数の値があり全て有効な場合、エラーをスローしないこと', () => {
      expect(() =>
        assertMetadata({
          key1: 'value1',
          key2: 'value2',
          key3: 'test',
        }),
      ).not.toThrow()
    })

    test('複数の値があり一つでも無効な場合、InvalidMetadataErrorをスローすること', () => {
      expect(() =>
        assertMetadata({
          key1: 'value1',
          key2: 'テスト',
          key3: 'test',
        }),
      ).toThrow(InvalidMetadataError)
    })
  })

  describe('isFunction', () => {
    test('関数の場合、trueを返すこと', () => {
      expect(isFunction(() => Promise.resolve(new Response()))).toBe(true)
    })

    test('関数でない場合、falseを返すこと', () => {
      expect(isFunction('string')).toBe(false)
      expect(isFunction(123)).toBe(false)
      expect(isFunction(null)).toBe(false)
      expect(isFunction(undefined)).toBe(false)
      expect(isFunction({})).toBe(false)
    })
  })
})
