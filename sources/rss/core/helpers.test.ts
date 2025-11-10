import { describe, test, expect } from 'vitest'
import { thumbnail, description, date, normalize } from './helpers'
import type { RawEntry } from './models'

describe('helpers.ts', () => {
  describe('thumbnail', () => {
    test('enclosureからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        enclosure: { url: 'https://example.com/image.jpg' },
      }

      expect(thumbnail(entry)).toBe('https://example.com/image.jpg')
    })

    test('mediaThumbnailオブジェクトからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaThumbnail: { $: { url: 'https://example.com/thumb.jpg' } },
      }

      expect(thumbnail(entry)).toBe('https://example.com/thumb.jpg')
    })

    test('mediaThumbnail文字列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaThumbnail: 'https://example.com/media.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/media.jpg')
    })

    test('mediaContentオブジェクトからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaContent: { $: { url: 'https://example.com/content.jpg' } },
      }

      expect(thumbnail(entry)).toBe('https://example.com/content.jpg')
    })

    test('mediaContent文字列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaContent: 'https://example.com/media-content.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/media-content.jpg')
    })

    test('mediaThumbnailの文字列配列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaThumbnail: ['https://example.com/thumb-array.jpg', 'https://example.com/thumb2.jpg'],
      }

      expect(thumbnail(entry)).toBe('https://example.com/thumb-array.jpg')
    })

    test('mediaThumbnailのオブジェクト配列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaThumbnail: [
          { $: { url: 'https://example.com/thumb-obj-array.jpg' } },
          { $: { url: 'https://example.com/thumb-obj2.jpg' } },
        ],
      }

      expect(thumbnail(entry)).toBe('https://example.com/thumb-obj-array.jpg')
    })

    test('mediaContentの文字列配列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaContent: ['https://example.com/content-array.jpg', 'https://example.com/content2.jpg'],
      }

      expect(thumbnail(entry)).toBe('https://example.com/content-array.jpg')
    })

    test('mediaContentのオブジェクト配列からサムネイルを取得すること', () => {
      const entry: RawEntry = {
        mediaContent: [
          { $: { url: 'https://example.com/content-obj-array.jpg' } },
          { $: { url: 'https://example.com/content-obj2.jpg' } },
        ],
      }

      expect(thumbnail(entry)).toBe('https://example.com/content-obj-array.jpg')
    })

    test('mediaGroupのmedia:thumbnailからサムネイルを取得すること（YouTube形式）', () => {
      const entry: RawEntry = {
        mediaGroup: {
          'media:thumbnail': [
            {
              $: {
                url: 'https://i3.ytimg.com/vi/VIDEO_ID/hqdefault.jpg',
                width: '480',
                height: '360',
              },
            },
          ],
          'media:content': [
            {
              $: {
                url: 'https://www.youtube.com/v/VIDEO_ID?version=3',
                type: 'application/x-shockwave-flash',
                width: '640',
                height: '390',
              },
            },
          ],
        },
      }

      expect(thumbnail(entry)).toBe('https://i3.ytimg.com/vi/VIDEO_ID/hqdefault.jpg')
    })

    test('mediaGroupにmedia:thumbnailがない場合、media:contentから取得すること', () => {
      const entry: RawEntry = {
        mediaGroup: {
          'media:content': [
            {
              $: {
                url: 'https://example.com/video-content.jpg',
                type: 'image/jpeg',
              },
            },
          ],
        },
      }

      expect(thumbnail(entry)).toBe('https://example.com/video-content.jpg')
    })

    test('contentから画像を抽出すること', () => {
      const entry: RawEntry = {
        content:
          '<p>Text <img src="https://example.com/content-img.jpg" alt="test"/> more text</p>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/content-img.jpg')
    })

    test('content:encodedから画像を抽出すること', () => {
      const entry: RawEntry = {
        'content:encoded': '<div><img src="https://example.com/encoded.jpg"/></div>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/encoded.jpg')
    })

    test('シングルクォートのimgから画像を抽出すること', () => {
      const entry: RawEntry = {
        content: "<img src='https://example.com/single-quote.jpg'/>",
      }

      expect(thumbnail(entry)).toBe('https://example.com/single-quote.jpg')
    })

    test('enclosureが最優先されること', () => {
      const entry: RawEntry = {
        enclosure: { url: 'https://example.com/priority.jpg' },
        mediaThumbnail: 'https://example.com/media.jpg',
        content: '<img src="https://example.com/content.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/priority.jpg')
    })

    test('enclosureがない場合、mediaが優先されること', () => {
      const entry: RawEntry = {
        mediaThumbnail: 'https://example.com/media.jpg',
        content: '<img src="https://example.com/content.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/media.jpg')
    })

    test('enclosureとmediaがない場合、imageが優先されること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/content.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/content.jpg')
    })

    test('サムネイルがない場合、undefinedを返すこと', () => {
      const entry: RawEntry = {}

      expect(thumbnail(entry)).toBeUndefined()
    })

    test('空のenclosureの場合、undefinedを返すこと', () => {
      const entry: RawEntry = {
        enclosure: {} as RawEntry['enclosure'],
      }

      expect(thumbnail(entry)).toBeUndefined()
    })

    test('画像タグのないcontentの場合、undefinedを返すこと', () => {
      const entry: RawEntry = {
        content: '<p>Text without image</p>',
      }

      expect(thumbnail(entry)).toBeUndefined()
    })

    test('itunesImageからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        itunesImage: 'https://example.com/itunes.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/itunes.jpg')
    })

    test('カスタムフィールドimageからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        image: 'https://example.com/custom-image.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/custom-image.jpg')
    })

    test('カスタムフィールドthumbnailからサムネイルを取得すること', () => {
      const entry: RawEntry = {
        thumbnail: 'https://example.com/custom-thumb.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/custom-thumb.jpg')
    })

    test('summaryから画像を抽出すること', () => {
      const entry: RawEntry = {
        summary: '<p>Summary with <img src="https://example.com/desc-img.jpg"/> image</p>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/desc-img.jpg')
    })

    test('imageがthumbnailより優先されること', () => {
      const entry: RawEntry = {
        image: 'https://example.com/image.jpg',
        thumbnail: 'https://example.com/thumb.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/image.jpg')
    })

    test('itunesImageがmediaより優先されること', () => {
      const entry: RawEntry = {
        itunesImage: 'https://example.com/itunes.jpg',
        mediaThumbnail: 'https://example.com/media.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/itunes.jpg')
    })

    test('mediaがcustomより優先されること', () => {
      const entry: RawEntry = {
        mediaThumbnail: 'https://example.com/media.jpg',
        image: 'https://example.com/custom.jpg',
      }

      expect(thumbnail(entry)).toBe('https://example.com/media.jpg')
    })

    test('customがcontentより優先されること', () => {
      const entry: RawEntry = {
        image: 'https://example.com/custom.jpg',
        content: '<img src="https://example.com/content.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/custom.jpg')
    })

    test('contentがsummaryより優先されること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/content.jpg"/>',
        summary: '<img src="https://example.com/desc.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/content.jpg')
    })

    test('完全な優先順位でenclosureが最優先されること', () => {
      const entry: RawEntry = {
        enclosure: { url: 'https://example.com/enclosure.jpg' },
        itunesImage: 'https://example.com/itunes.jpg',
        mediaThumbnail: 'https://example.com/media.jpg',
        image: 'https://example.com/image.jpg',
        content: '<img src="https://example.com/content.jpg"/>',
        summary: '<img src="https://example.com/summary.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/enclosure.jpg')
    })

    test('アンパサンドを含むURLを正しくデコードすること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/image.jpg?foo=bar&amp;baz=qux"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/image.jpg?foo=bar&baz=qux')
    })

    test('ダブルクォーテーションを含むURLを正しくデコードすること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/image.jpg?param=&quot;value&quot;"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/image.jpg?param="value"')
    })

    test('数値参照を含むURLを正しくデコードすること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/image.jpg?name=John&#39;s"/>',
      }

      expect(thumbnail(entry)).toBe("https://example.com/image.jpg?name=John's")
    })

    test('16進数数値参照を含むURLを正しくデコードすること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/image.jpg?char=&#x27;test&#x27;"/>',
      }

      expect(thumbnail(entry)).toBe("https://example.com/image.jpg?char='test'")
    })

    test('相対URLを絶対URLに変換すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/article/123',
        content: '<img src="/images/thumbnail.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/images/thumbnail.jpg')
    })

    test('上位相対URLを絶対URLに変換すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/articles/2024/post',
        content: '<img src="../images/thumb.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/articles/images/thumb.jpg')
    })

    test('直下相対URLを絶対URLに変換すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/blog/article',
        content: '<img src="./images/photo.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/blog/images/photo.jpg')
    })

    test('プロトコル相対URLを絶対URLに変換すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/article',
        content: '<img src="//cdn.example.com/images/photo.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://cdn.example.com/images/photo.jpg')
    })

    test('linkがない場合、相対URLをそのまま返すこと', () => {
      const entry: RawEntry = {
        content: '<img src="/images/thumbnail.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('/images/thumbnail.jpg')
    })

    test('既に絶対URLの場合、そのまま返すこと', () => {
      const entry: RawEntry = {
        link: 'https://example.com/article',
        content: '<img src="https://cdn.example.com/image.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://cdn.example.com/image.jpg')
    })

    test('src属性の前後に空白があるimgから画像を抽出すること', () => {
      const entry: RawEntry = {
        content: '<img src = "https://example.com/whitespace.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/whitespace.jpg')
    })

    test('複数の属性を持つimgからsrcを抽出すること', () => {
      const entry: RawEntry = {
        content:
          '<img class="thumbnail" id="main-img" alt="Test" src="https://example.com/complex.jpg" width="800"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/complex.jpg')
    })

    test('src属性が後ろにある場合でも画像を抽出すること', () => {
      const entry: RawEntry = {
        content:
          '<img class="photo" alt="Photo" data-id="123" src="https://example.com/late-src.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/late-src.jpg')
    })

    test('複数のHTMLエンティティを含むURLを正しくデコードすること', () => {
      const entry: RawEntry = {
        content: '<img src="https://example.com/image.jpg?a=1&amp;b=2&amp;c=&#39;test&#39;"/>',
      }

      expect(thumbnail(entry)).toBe("https://example.com/image.jpg?a=1&b=2&c='test'")
    })

    test('相対URLとHTMLエンティティの両方を処理すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/article',
        content: '<img src="/images/photo.jpg?param=value&amp;other=test"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/images/photo.jpg?param=value&other=test')
    })

    test('複数画像がある場合、最初の画像を抽出すること', () => {
      const entry: RawEntry = {
        content:
          '<div><img src="https://example.com/first.jpg"/><img src="https://example.com/second.jpg"/></div>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/first.jpg')
    })

    test('500文字以上の長いdata属性を持つimgタグから画像を抽出すること', () => {
      const caption =
        'This is a very long caption that describes the image in great detail. It contains multiple sentences and a lot of information about the context, the people in the image, the location, and other relevant details that make it exceed 500 characters. This tests the scenario where data-caption or other data attributes are very long, which can cause the regex pattern with a 500-character limit to fail. We need to ensure that our updated 2000-character limit can handle such cases properly and extract the src attribute even when it appears after very long attributes.'
      const entry: RawEntry = {
        content: `<figure><img alt="Test image" data-caption="${caption}" data-portal-copyright="" src="https://example.com/long-attribute-image.jpg" /></figure>`,
      }

      expect(thumbnail(entry)).toBe('https://example.com/long-attribute-image.jpg')
    })

    test('複数の長いdata属性を持つimgタグから画像を抽出すること', () => {
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(15)
      const entry: RawEntry = {
        content: `<img alt="Description" data-caption="${text}" data-copyright="${text}" data-author="Photographer Name" src="https://example.com/complex-image.jpg?quality=90" />`,
      }

      expect(thumbnail(entry)).toBe('https://example.com/complex-image.jpg?quality=90')
    })

    test('summaryからも相対URLを絶対URLに変換すること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/post',
        summary: '<img src="./thumb.jpg"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/thumb.jpg')
    })

    test('summaryからもHTMLエンティティをデコードすること', () => {
      const entry: RawEntry = {
        summary: '<img src="https://example.com/image.jpg?a=1&amp;b=2"/>',
      }

      expect(thumbnail(entry)).toBe('https://example.com/image.jpg?a=1&b=2')
    })
  })

  describe('description', () => {
    test('contentSnippetから説明を取得すること', () => {
      const entry: RawEntry = {
        contentSnippet: 'This is a snippet',
      }

      expect(description(entry)).toBe('This is a snippet')
    })

    test('summaryから説明を取得すること', () => {
      const entry: RawEntry = {
        summary: 'This is a summary',
      }

      expect(description(entry)).toBe('This is a summary')
    })

    test('contentからHTMLを除去して説明を取得すること', () => {
      const entry: RawEntry = {
        content: '<p>This is <strong>bold</strong> text</p>',
      }

      expect(description(entry)).toBe('This is bold text')
    })

    test('content:encodedからHTMLを除去して説明を取得すること', () => {
      const entry: RawEntry = {
        'content:encoded': '<div>Encoded <em>content</em></div>',
      }

      expect(description(entry)).toBe('Encoded content')
    })

    test('複雑なHTMLタグを除去すること', () => {
      const entry: RawEntry = {
        content: '<div class="container"><p style="color:red">Text</p><a href="#">Link</a></div>',
      }

      expect(description(entry)).toBe('TextLink')
    })

    test('前後の空白をトリムすること', () => {
      const entry: RawEntry = {
        content: '   <p>  Text with spaces  </p>   ',
      }

      expect(description(entry)).toBe('Text with spaces')
    })

    test('contentSnippetが最優先されること', () => {
      const entry: RawEntry = {
        contentSnippet: 'Priority snippet',
        summary: 'Summary text',
        content: '<p>Content text</p>',
      }

      expect(description(entry)).toBe('Priority snippet')
    })

    test('contentSnippetがない場合、summaryが優先されること', () => {
      const entry: RawEntry = {
        summary: 'Summary text',
        content: '<p>Content text</p>',
      }

      expect(description(entry)).toBe('Summary text')
    })

    test('contentSnippetとsummaryがない場合、contentが優先されること', () => {
      const entry: RawEntry = {
        content: '<p>Content text</p>',
      }

      expect(description(entry)).toBe('Content text')
    })

    test('説明がない場合、undefinedを返すこと', () => {
      const entry: RawEntry = {}

      expect(description(entry)).toBeUndefined()
    })

    test('空のcontentの場合、undefinedを返すこと', () => {
      const entry: RawEntry = {
        content: '',
      }

      expect(description(entry)).toBeUndefined()
    })

    test('HTMLタグのみのcontentの場合空文字列を返す', () => {
      const entry: RawEntry = {
        content: '<p></p><div></div>',
      }

      expect(description(entry)).toBe('')
    })
  })

  describe('date', () => {
    test('isoDateから日付を取得すること', () => {
      const entry: RawEntry = {
        isoDate: '2024-01-01T00:00:00.000Z',
      }

      const result = date(entry)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('pubDateから日付を取得すること', () => {
      const entry: RawEntry = {
        pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      }

      const result = date(entry)
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('異なる日付文字列を正しくパースすること', () => {
      const entry: RawEntry = {
        isoDate: '2024-12-31T23:59:59.000Z',
      }

      const result = date(entry)
      expect(result?.toISOString()).toBe('2024-12-31T23:59:59.000Z')
    })

    test('isoDateが最優先されること', () => {
      const entry: RawEntry = {
        isoDate: '2024-01-01T00:00:00.000Z',
        pubDate: 'Mon, 31 Dec 2023 00:00:00 GMT',
      }

      const result = date(entry)
      expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('isoDateがない場合、pubDateが優先されること', () => {
      const entry: RawEntry = {
        pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      }

      const result = date(entry)
      expect(result).toBeInstanceOf(Date)
    })

    test('日付がない場合、undefinedを返すこと', () => {
      const entry: RawEntry = {}

      expect(date(entry)).toBeUndefined()
    })

    test('空のisoDateの場合、undefinedを返すこと', () => {
      const entry: RawEntry = {
        isoDate: '',
      }

      const result = date(entry)
      expect(result).toBeUndefined()
    })

    test('不正なpubDateの場合undefinedを返す', () => {
      const entry: RawEntry = {
        pubDate: 'not a valid date',
      }

      const result = date(entry)
      expect(result).toBeUndefined()
    })
  })

  describe('normalize', () => {
    test('完全なEntryを正規化すること', () => {
      const entry: RawEntry = {
        guid: 'entry-123',
        title: 'Test Entry',
        contentSnippet: 'Test description',
        link: 'https://example.com/entry',
        enclosure: { url: 'https://example.com/thumb.jpg', length: 12345, type: 'image/jpeg' },
        isoDate: '2024-01-01T00:00:00.000Z',
        creator: 'Test Author',
        categories: ['Tech', 'News'],
      }

      const result = normalize(entry)

      expect(result).toEqual({
        identifier: 'entry-123',
        title: 'Test Entry',
        description: 'Test description',
        link: 'https://example.com/entry',
        thumbnail: 'https://example.com/thumb.jpg',
        published: new Date('2024-01-01T00:00:00.000Z'),
        creator: 'Test Author',
        categories: ['Tech', 'News'],
        snippet: 'Test description',
      })
    })

    test('部分的なEntryを正規化すること', () => {
      const entry: RawEntry = {
        title: 'Minimal Entry',
      }

      const result = normalize(entry)

      expect(result).toEqual({
        identifier: undefined,
        title: 'Minimal Entry',
        description: undefined,
        link: undefined,
        thumbnail: undefined,
        published: undefined,
        creator: undefined,
        categories: undefined,
        snippet: undefined,
      })
    })

    test('空のEntryを正規化すること', () => {
      const entry: RawEntry = {}

      const result = normalize(entry)

      expect(result).toEqual({
        identifier: undefined,
        title: undefined,
        description: undefined,
        link: undefined,
        thumbnail: undefined,
        published: undefined,
        creator: undefined,
        categories: undefined,
        snippet: undefined,
        enclosure: undefined,
      })
    })

    test('guidをidentifierにマッピングすること', () => {
      const entry: RawEntry = {
        guid: 'unique-id-456',
      }

      const result = normalize(entry)

      expect(result.identifier).toBe('unique-id-456')
    })

    test('titleをそのままマッピングすること', () => {
      const entry: RawEntry = {
        title: 'Article Title',
      }

      const result = normalize(entry)

      expect(result.title).toBe('Article Title')
    })

    test('linkをそのままマッピングすること', () => {
      const entry: RawEntry = {
        link: 'https://example.com/article',
      }

      const result = normalize(entry)

      expect(result.link).toBe('https://example.com/article')
    })

    test('descriptionをextractorを使用して取得すること', () => {
      const entry: RawEntry = {
        summary: 'Summary text',
      }

      const result = normalize(entry)

      expect(result.description).toBe('Summary text')
    })

    test('thumbnailをextractorを使用して取得すること', () => {
      const entry: RawEntry = {
        mediaThumbnail: 'https://example.com/media.jpg',
      }

      const result = normalize(entry)

      expect(result.thumbnail).toBe('https://example.com/media.jpg')
    })

    test('publishedAtをextractorを使用して取得すること', () => {
      const entry: RawEntry = {
        pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      }

      const result = normalize(entry)

      expect(result.published).toBeInstanceOf(Date)
      expect(result.published?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('contentからHTMLが除去されてdescriptionになること', () => {
      const entry: RawEntry = {
        content: '<p>HTML <strong>content</strong></p>',
      }

      const result = normalize(entry)

      expect(result.description).toBe('HTML content')
    })

    test('複数のソースから正しくサムネイルを取得すること', () => {
      const entry: RawEntry = {
        enclosure: { url: 'https://example.com/enclosure.jpg' },
        mediaThumbnail: 'https://example.com/media.jpg',
      }

      const result = normalize(entry)

      expect(result.thumbnail).toBe('https://example.com/enclosure.jpg')
    })

    test('isoDateとpubDateの両方がある場合isoDateを優先すること', () => {
      const entry: RawEntry = {
        isoDate: '2024-01-01T00:00:00.000Z',
        pubDate: 'Mon, 31 Dec 2023 00:00:00 GMT',
      }

      const result = normalize(entry)

      expect(result.published?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('正規化されたエントリのプロパティを正しい型とすること', () => {
      const entry: RawEntry = {
        guid: 'test-id',
        title: 'Test',
        contentSnippet: 'Description',
        link: 'https://example.com',
        enclosure: { url: 'https://example.com/img.jpg', length: 1000, type: 'image/jpeg' },
        isoDate: '2024-01-01T00:00:00.000Z',
        creator: 'Author Name',
        categories: ['Category1', 'Category2'],
      }

      const result = normalize(entry)

      expect(typeof result.identifier).toBe('string')
      expect(typeof result.title).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.link).toBe('string')
      expect(typeof result.thumbnail).toBe('string')
      expect(result.published).toBeInstanceOf(Date)
      expect(typeof result.creator).toBe('string')
      expect(Array.isArray(result.categories)).toBe(true)
      expect(typeof result.snippet).toBe('string')
    })

    test('creatorをそのままマッピングすること', () => {
      const entry: RawEntry = {
        creator: 'John Doe',
      }

      const result = normalize(entry)

      expect(result.creator).toBe('John Doe')
    })

    test('categoriesをそのままマッピングすること', () => {
      const entry: RawEntry = {
        categories: ['Tech', 'Science', 'News'],
      }

      const result = normalize(entry)

      expect(result.categories).toEqual(['Tech', 'Science', 'News'])
    })

    test('contentSnippetをsnippetにマッピングすること', () => {
      const entry: RawEntry = {
        contentSnippet: 'This is a snippet text',
      }

      const result = normalize(entry)

      expect(result.snippet).toBe('This is a snippet text')
    })
  })
})
