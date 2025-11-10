import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { describe, test, expect } from 'vitest'

import { UnsafeUrlError, InvalidMetadataError, VerifyError } from './errors'
import {
  assertMetadata,
  assertUrl,
  chain,
  failify,
  isCancelled,
  isFunction,
  isResponse,
  isString,
  outcomify,
  unify,
  unwrap,
} from './helpers'

describe('helpers.ts', () => {
  describe('unwrap', () => {
    describe('Content-Type', () => {
      test('application/jsonの場合、JSONとして取得すること', async () => {
        const data = { name: 'test' }

        const response = await unwrap(
          new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        expect(response).toEqual(data)
      })

      test('text/plainの場合、テキストとして取得すること', async () => {
        const text = 'test text'

        const response = await unwrap(
          new Response(text, {
            headers: { 'Content-Type': 'text/plain' },
          }),
        )

        expect(response).toBe(text)
      })

      test('application/xmlの場合、テキストとして取得すること', async () => {
        const xml = '<?xml version="1.0"?><root><item>test</item></root>'

        const response = await unwrap(
          new Response(xml, {
            status: StatusCodes.OK,
            headers: { 'Content-Type': 'application/xml' },
          }),
        )

        expect(response).toBe(xml)
      })

      test('text/xmlの場合、テキストとして取得すること', async () => {
        const xml = '<?xml version="1.0"?><data>test</data>'

        const response = await unwrap(
          new Response(xml, {
            status: StatusCodes.OK,
            headers: { 'Content-Type': 'text/xml' },
          }),
        )

        expect(response).toBe(xml)
      })

      test('application/octet-streamの場合、テキストとして取得すること', async () => {
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

      test('未指定の場合、テキストとして取得すること', async () => {
        const text = 'plain text'

        const response = await unwrap(new Response(text, { status: StatusCodes.OK }))

        expect(response).toBe(text)
      })
    })

    describe('status', () => {
      test(`${StatusCodes.NO_CONTENT}の場合、undefinedを返すこと`, async () => {
        const response = await unwrap(new Response(null, { status: StatusCodes.NO_CONTENT }))

        expect(response).toBeUndefined()
      })
    })
  })

  describe('outcomify', () => {
    test('2xxの場合、成功結果を返すこと', async () => {
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

    test(`${StatusCodes.NO_CONTENT}の場合、undefinedを返すこと`, async () => {
      const response = await outcomify(new Response(null, { status: StatusCodes.NO_CONTENT }))

      expect(response).toEqual({
        success: true,
        status: StatusCodes.NO_CONTENT,
        data: undefined,
      })
    })

    test('4xxの場合、失敗結果を返すこと', async () => {
      const body = { error: getReasonPhrase(StatusCodes.NOT_FOUND) }

      const response = await outcomify(
        new Response(JSON.stringify(body), {
          status: StatusCodes.NOT_FOUND,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: getReasonPhrase(StatusCodes.NOT_FOUND),
        body: body,
      })
    })

    test('5xxの場合、失敗結果を返すこと', async () => {
      const body = {
        error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      }

      const response = await outcomify(
        new Response(JSON.stringify(body), {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        body: body,
      })
    })

    test('検証関数が未指定の場合、成功結果を返すこと', async () => {
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

    test('検証関数をパスした場合、成功結果を返すこと', async () => {
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

    test('検証関数をパスしない場合、例外をスローすること', async () => {
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
      ).rejects.toThrow(VerifyError)
    })

    test('検証関数内でエラーが発生した場合、その例外を伝播すること', async () => {
      await expect(
        outcomify(
          new Response(JSON.stringify({ id: 1 }), {
            status: StatusCodes.OK,
          }),
          () => {
            throw new Error('The operation was aborted')
          },
        ),
      ).rejects.toThrow('The operation was aborted')
    })
  })

  describe('failify', () => {
    test('JSONの場合、失敗結果を返すこと', async () => {
      const data = { message: 'I am a message' }
      const response = await failify(
        new Response(JSON.stringify(data), {
          status: StatusCodes.BAD_REQUEST,
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.BAD_REQUEST,
        message: data.message,
        body: data,
      })
    })

    test('JSONの場合、失敗結果に完全なレスポンスを格納すること', async () => {
      const body = {
        message: 'I am a message',
        errors: ['Field1 is invalid', 'Field2 is invalid'],
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

    test('JSONパースに失敗した場合、フォールバック処理を行うこと', async () => {
      const response = await failify(
        new Response('I am not JSON', {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }),
      )

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
      if (!response.success) {
        expect(response.body).toBeUndefined()
      }
    })

    test('中断された場合、失敗結果を返すこと', async () => {
      const response = await failify(new DOMException('The operation was aborted', 'AbortError'))

      expect(response).toEqual({
        success: false,
        status: StatusCodes.REQUEST_TIMEOUT,
        message: getReasonPhrase(StatusCodes.REQUEST_TIMEOUT),
      })
    })

    test('例外オブジェクトの場合、失敗結果を返すこと', async () => {
      const thrown = new Error('I was thrown')

      const response = await failify(thrown)

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: thrown.message,
      })
    })

    test('その他の場合、失敗結果を返すこと', async () => {
      const response = await failify('unknown')

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      })
    })
  })

  describe('unify', () => {
    test('ソースが文字列の場合、成功結果を返すこと', async () => {
      const data = { id: 1 }
      const executor = async () => ({
        success: true as const,
        status: StatusCodes.OK,
        data,
      })

      const response = await unify({
        source: '/api/users',
        executor,
      })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data,
      })
    })

    test('ソースが関数の場合、成功結果を返すこと', async () => {
      const data = { id: 1 }
      const executor = async () => ({
        success: true as const,
        status: StatusCodes.OK,
        data,
      })

      const response = await unify({
        source: () => '/api/users',
        executor,
      })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data,
      })
    })

    test('ソースが動的パラメータの場合、成功結果を返すこと', async () => {
      const executor = async (endpoint: string) => ({
        success: true as const,
        status: StatusCodes.OK,
        data: { endpoint },
      })

      const response = await unify({
        source: (id, name) => `/api/users/${id}/${name}`,
        parameters: [1, 'test'],
        executor,
      })

      expect(response).toEqual({
        success: true,
        status: StatusCodes.OK,
        data: { endpoint: '/api/users/1/test' },
      })
    })

    test('ハンドラー内でエラーが発生した場合、失敗結果を返すこと', async () => {
      const executor = async () => {
        throw new Error('The execution was aborted')
      }

      const response = await unify({
        source: '/api/users',
        executor,
      })

      expect(response).toEqual({
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'The execution was aborted',
      })
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
    test('空のオブジェクトの場合、エラーとならないこと', () => {
      expect(() => assertMetadata({})).not.toThrow()
    })

    test('ASCII文字のみの場合、エラーとならないこと', () => {
      expect(() => assertMetadata({ key: 'value', name: 'test' })).not.toThrow()
    })

    test('ISO-8859-1の範囲内の文字の場合、エラーとならないこと', () => {
      expect(() => assertMetadata({ header: 'àéîöü' })).not.toThrow()
    })

    test('境界値（=255）の場合、エラーとならないこと', () => {
      const char255 = String.fromCharCode(255)
      expect(() => assertMetadata({ header: char255 })).not.toThrow()
    })

    test('境界値（=32、=126）の場合、エラーとならないこと', () => {
      expect(() => assertMetadata({ header: ' ' })).not.toThrow()
      expect(() => assertMetadata({ header: '~' })).not.toThrow()
    })

    test('制御文字の場合、例外をスローすること', () => {
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

    test('境界値（=256）の場合、例外をスローすること', () => {
      const char256 = String.fromCharCode(256)
      expect(() => assertMetadata({ header: char256 })).toThrow(InvalidMetadataError)
    })

    test('日本語文字の場合、例外をスローすること', () => {
      expect(() => assertMetadata({ header: 'テスト' })).toThrow(InvalidMetadataError)
    })

    test('絵文字の場合、例外をスローすること', () => {
      expect(() => assertMetadata({ header: '🎉' })).toThrow(InvalidMetadataError)
    })

    test('複数の値があり全て有効な場合、エラーとならないこと', () => {
      expect(() =>
        assertMetadata({
          key1: 'value1',
          key2: 'value2',
          key3: 'test',
        }),
      ).not.toThrow()
    })

    test('複数の値があり一つでも無効な場合、例外をスローすること', () => {
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

  describe('isResponse', () => {
    test('レスポンスオブジェクトの場合、trueを返すこと', () => {
      expect(isResponse(new Response())).toBe(true)
    })

    test('レスポンスオブジェクトでない場合、falseを返すこと', () => {
      expect(isResponse('string')).toBe(false)
      expect(isResponse(123)).toBe(false)
      expect(isResponse(null)).toBe(false)
      expect(isResponse(undefined)).toBe(false)
      expect(isResponse({})).toBe(false)
    })
  })

  describe('isString', () => {
    test('文字列の場合、trueを返すこと', () => {
      expect(isString('string')).toBe(true)
    })

    test('文字列でない場合、falseを返すこと', () => {
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString({})).toBe(false)
    })
  })

  describe('isCancelled', () => {
    test('中断した場合、trueを返すこと', () => {
      expect(isCancelled(new DOMException('The operation was aborted', 'AbortError'))).toBe(true)
    })

    test('タイムアウトした場合、trueを返すこと', () => {
      expect(isCancelled(new DOMException('The operation timed out', 'TimeoutError'))).toBe(true)
    })

    test('その他のエラーの場合、falseを返すこと', () => {
      expect(isCancelled(new Error())).toBe(false)
    })
  })

  describe('chain', () => {
    test('両方の関数がある場合、順番に実行すること', () => {
      const called: number[] = []
      const parent = () => called.push(1)
      const child = () => called.push(2)

      const chained = chain(parent, child)
      chained?.()

      expect(called).toEqual([1, 2])
    })

    test('親のみの場合、親を返すこと', () => {
      const parent = () => 'parent'

      const chained = chain(parent, undefined)

      expect(chained).toBe(parent)
    })

    test('子のみの場合、子を返すこと', () => {
      const child = () => 'child'

      const chained = chain(undefined, child)

      expect(chained).toBe(child)
    })

    test('両方undefinedの場合、undefinedを返すこと', () => {
      const chained = chain(undefined, undefined)

      expect(chained).toBeUndefined()
    })
  })
})
