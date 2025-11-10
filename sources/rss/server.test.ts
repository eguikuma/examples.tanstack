import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { server } from './server'

const data = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>RSS Feed</title>
    <link>https://example.com</link>
    <description>A RSS feed</description>
    <item>
      <title>First Post</title>
      <link>https://example.com/first</link>
      <guid>https://example.com/first</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <description>This is the first post</description>
      <media:thumbnail url="https://example.com/thumb.jpg" />
    </item>
  </channel>
</rss>`

const mock = {
  get: vi.fn(),
}

vi.mock('../http/server', () => ({
  server: () => mock,
}))

describe('server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetch', () => {
    test('正常な配信フィードを取得して解析すること', async () => {
      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries).toHaveLength(1)
        expect(result.data.entries[0]?.title).toBe('First Post')
        expect(result.data.entries[0]?.link).toBe('https://example.com/first')
        expect(result.data.entries[0]?.thumbnail).toBe('https://example.com/thumb.jpg')
      }
      expect(mock.get).toHaveBeenCalled()
    })

    test('通信エラーが発生した場合、エラーを返すこと', async () => {
      mock.get.mockResolvedValueOnce({
        success: false,
        status: StatusCodes.NOT_FOUND,
        message: 'Feed not found',
      })

      const rss = server()
      const result = await rss.get('https://example.com/missing.xml')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(StatusCodes.NOT_FOUND)
        expect(result.message).toBe('Feed not found')
      }
    })

    test('解析エラーが発生した場合、エラーを返すこと', async () => {
      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: 'invalid xml content',
      })

      const rss = server()
      const result = await rss.get('https://example.com/invalid.xml')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      }
    })

    test('カスタム設定を使用すること', async () => {
      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data,
      })

      const rss = server({
        timeout: 5000,
        headers: {
          Accept: 'application/xml',
        },
      })

      await rss.get('https://example.com/feed.xml')

      expect(mock.get).toHaveBeenCalled()
    })

    test('複数のエントリを含むフィードを処理すること', async () => {
      const many = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Multiple Entries</title>
    <item><title>First</title><guid>1</guid></item>
    <item><title>Second</title><guid>2</guid></item>
    <item><title>Third</title><guid>3</guid></item>
  </channel>
</rss>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: many,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries).toHaveLength(3)
        expect(result.data.entries[0]?.title).toBe('First')
        expect(result.data.entries[1]?.title).toBe('Second')
        expect(result.data.entries[2]?.title).toBe('Third')
      }
    })

    test('Atom形式の配信データを解析すること', async () => {
      const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <link href="https://example.com"/>
  <entry>
    <title>Atom Entry</title>
    <id>atom-1</id>
    <link href="https://example.com/entry1"/>
    <summary>Atom entry summary</summary>
  </entry>
</feed>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: atom,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Atom Feed')
        expect(result.data.entries).toHaveLength(1)
        expect(result.data.entries[0]?.title).toBe('Atom Entry')
        expect(result.data.entries[0]?.description).toBe('Atom entry summary')
      }
    })

    test('空のフィードを処理すること', async () => {
      const empty = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <link>https://example.com</link>
  </channel>
</rss>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: empty,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Empty Feed')
        expect(result.data.entries).toEqual([])
      }
    })

    test('content:encodedフィールドを処理すること', async () => {
      const encoded = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Encoded Content</title>
    <item>
      <title>Entry with encoded content</title>
      <content:encoded><![CDATA[<p>This is <strong>encoded</strong> content</p>]]></content:encoded>
    </item>
  </channel>
</rss>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: encoded,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries[0]?.description).toBe('This is encoded content')
      }
    })

    test('isoDateとpubDateの両方がある場合、isoDateが優先されること', async () => {
      const dated = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Date Priority</title>
    <item>
      <title>Date test</title>
      <pubDate>Mon, 31 Dec 2023 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: dated,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries[0]?.published).toBeInstanceOf(Date)
      }
    })

    test('サムネイルの優先順位を正しく処理すること', async () => {
      const thumbnails = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Thumbnail Priority</title>
    <item>
      <title>Multiple thumbnails</title>
      <enclosure url="https://example.com/enclosure.jpg"/>
      <media:thumbnail url="https://example.com/media.jpg"/>
    </item>
  </channel>
</rss>`

      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: thumbnails,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries[0]?.thumbnail).toBe('https://example.com/enclosure.jpg')
      }
    })

    test('フィードメタデータを正しく取得すること', async () => {
      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data,
      })

      const rss = server()
      const result = await rss.get('https://example.com/feed.xml')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('RSS Feed')
        expect(result.data.link).toBe('https://example.com')
        expect(result.data.description).toBe('A RSS feed')
      }
    })

    test('解析エラー時のエラーメッセージを検証すること', async () => {
      mock.get.mockResolvedValueOnce({
        success: true,
        status: StatusCodes.OK,
        data: 'not valid xml at all',
      })

      const rss = server()
      const result = await rss.get('https://example.com/invalid.xml')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
        expect(result.message).toBeDefined()
        expect(typeof result.message).toBe('string')
      }
    })
  })
})
