import { describe, test, expect } from 'vitest'
import { react } from './react.client'

describe('react.client.ts', () => {
  describe('react', () => {
    test('既定のオプションで配信データクライアントを作成すること', () => {
      const rss = react()

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })

    test('fetchメソッドを定義すること', () => {
      const rss = react()

      expect(typeof rss.get).toBe('function')
      expect(typeof rss.infinite).toBe('function')
    })

    test('異なるオプションで複数のクライアントを作成できること', () => {
      const rss1 = react()
      const rss2 = react({ timeout: 5000 })

      expect(rss1).toBeDefined()
      expect(rss2).toBeDefined()
      expect(rss1).not.toBe(rss2)
      expect(rss1.get).not.toBe(rss2.get)
      expect(rss1.infinite).not.toBe(rss2.infinite)
    })

    test('カスタムタイムアウトでクライアントを作成できること', () => {
      const rss = react({ timeout: 15000 })

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })

    test('カスタムヘッダーでクライアントを作成できること', () => {
      const rss = react({
        headers: {
          'User-Agent': 'MyApp/1.0',
        },
      })

      expect(rss).toBeDefined()
      expect(rss.get).toBeDefined()
      expect(rss.infinite).toBeDefined()
    })
  })
})
