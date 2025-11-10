import { describe, test, expect } from 'vitest'
import { FeedParser } from './parser'

const valid = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <item>
      <title>Test Item</title>
      <link>https://example.com/item1</link>
      <description>Test description</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <media:thumbnail url="https://example.com/thumb.jpg" />
    </item>
  </channel>
</rss>`

const media = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Media Feed</title>
    <item>
      <title>Media Item</title>
      <media:content url="https://example.com/media.jpg" type="image/jpeg" />
    </item>
  </channel>
</rss>`

const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <link href="https://example.com"/>
  <updated>2024-01-01T00:00:00Z</updated>
  <entry>
    <title>Atom Entry</title>
    <link href="https://example.com/entry1"/>
    <updated>2024-01-01T00:00:00Z</updated>
    <summary>Atom entry summary</summary>
  </entry>
</feed>`

describe('parser.ts', () => {
  describe('parse', () => {
    test('正常な配信フィードを解析すること', async () => {
      const parser = new FeedParser()
      const result = await parser.parse(valid)

      expect(result.title).toBe('Test Feed')
      expect(result.link).toBe('https://example.com')
      expect(result.description).toBe('A test RSS feed')
      expect(result.entries).toHaveLength(1)
    })

    test('アイテムのプロパティを解析すること', async () => {
      const parser = new FeedParser()
      const result = await parser.parse(valid)

      const entry = result.entries?.[0]
      expect(entry?.title).toBe('Test Item')
      expect(entry?.link).toBe('https://example.com/item1')
      expect(entry?.description).toBe('Test description')
    })

    test('カスタムフィールドmediaThumbnailを解析すること', async () => {
      const parser = new FeedParser()
      const result = await parser.parse(valid)

      const entry = result.entries?.[0]
      expect(entry?.thumbnail).toBe('https://example.com/thumb.jpg')
    })

    test('カスタムフィールドmediaContentを解析すること', async () => {
      const parser = new FeedParser()
      const result = await parser.parse(media)

      const entry = result.entries?.[0]
      expect(entry?.thumbnail).toBe('https://example.com/media.jpg')
    })

    test('Atom形式の配信データを解析すること', async () => {
      const parser = new FeedParser()
      const result = await parser.parse(atom)

      expect(result.title).toBe('Atom Feed')
      expect(result.entries).toHaveLength(1)
      expect(result.entries?.[0]?.title).toBe('Atom Entry')
    })

    test('不正なデータの場合、エラーをスローすること', async () => {
      const parser = new FeedParser()

      await expect(parser.parse('invalid xml content')).rejects.toThrow()
    })

    test('空のデータの場合、エラーをスローすること', async () => {
      const parser = new FeedParser()

      await expect(parser.parse('')).rejects.toThrow()
    })

    test('閉じタグのないデータの場合、エラーをスローすること', async () => {
      const parser = new FeedParser()
      const malformed = '<rss><channel><title>Unclosed'

      await expect(parser.parse(malformed)).rejects.toThrow()
    })

    test('複数のアイテムを含むフィードを解析すること', async () => {
      const parser = new FeedParser()
      const multiple = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Multiple Items</title>
    <item><title>Item 1</title></item>
    <item><title>Item 2</title></item>
    <item><title>Item 3</title></item>
  </channel>
</rss>`

      const result = await parser.parse(multiple)

      expect(result.entries).toHaveLength(3)
      expect(result.entries?.[0]?.title).toBe('Item 1')
      expect(result.entries?.[1]?.title).toBe('Item 2')
      expect(result.entries?.[2]?.title).toBe('Item 3')
    })

    test('アイテムのないフィードを解析すること', async () => {
      const parser = new FeedParser()
      const empty = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
  </channel>
</rss>`

      const result = await parser.parse(empty)

      expect(result.title).toBe('Empty Feed')
      expect(result.entries).toEqual([])
    })
  })

  describe('constructor', () => {
    test('RssParserインスタンスを作成すること', () => {
      const parser = new FeedParser()

      expect(parser).toBeInstanceOf(FeedParser)
    })

    test('複数のインスタンスを独立して作成できること', () => {
      const parser1 = new FeedParser()
      const parser2 = new FeedParser()

      expect(parser1).toBeInstanceOf(FeedParser)
      expect(parser2).toBeInstanceOf(FeedParser)
      expect(parser1).not.toBe(parser2)
    })
  })
})
