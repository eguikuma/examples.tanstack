import type { RawEntry, Entry } from './models'

const enclosure = (entry: RawEntry): string | undefined => entry.enclosure?.url

const itunes = (entry: RawEntry): string | undefined => entry.itunesImage

const media = (entry: RawEntry): string | undefined => {
  if (typeof entry.mediaThumbnail === 'string') {
    return entry.mediaThumbnail
  }

  if (Array.isArray(entry.mediaThumbnail) && entry.mediaThumbnail.length > 0) {
    const first = entry.mediaThumbnail[0]

    if (typeof first === 'string') {
      return first
    }

    if (typeof first === 'object' && first?.$?.url) {
      return first.$.url
    }
  }

  if (
    entry.mediaThumbnail &&
    typeof entry.mediaThumbnail === 'object' &&
    !Array.isArray(entry.mediaThumbnail)
  ) {
    if (entry.mediaThumbnail.$?.url) {
      return entry.mediaThumbnail.$.url
    }
  }

  if (typeof entry.mediaContent === 'string') {
    return entry.mediaContent
  }

  if (Array.isArray(entry.mediaContent) && entry.mediaContent.length > 0) {
    const first = entry.mediaContent[0]

    if (typeof first === 'string') {
      return first
    }

    if (typeof first === 'object' && first?.$?.url) {
      return first.$.url
    }
  }

  if (
    entry.mediaContent &&
    typeof entry.mediaContent === 'object' &&
    !Array.isArray(entry.mediaContent)
  ) {
    if (entry.mediaContent.$?.url) {
      return entry.mediaContent.$.url
    }
  }

  if (entry.mediaGroup) {
    const thumbnails = entry.mediaGroup['media:thumbnail']

    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
      const url = thumbnails[0]?.$?.url

      if (url) {
        return url
      }
    }

    const contents = entry.mediaGroup['media:content']

    if (Array.isArray(contents) && contents.length > 0) {
      const url = contents[0]?.$?.url
      if (url) {
        return url
      }
    }
  }

  return undefined
}

const custom = (entry: RawEntry): string | undefined => entry.image || entry.thumbnail

const html = (text: string): string =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const point = Number.parseInt(code, 10)

      if (point < 32 || point === 127 || point > 0x10ffff) {
        return ''
      }

      return String.fromCodePoint(point)
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const point = Number.parseInt(hex, 16)

      if (point < 32 || point === 127 || point > 0x10ffff) {
        return ''
      }

      return String.fromCodePoint(point)
    })

const absolute = (url: string, base?: string): string | undefined => {
  if (/^(file|javascript|vbscript):/i.test(url)) {
    return undefined
  }

  if (/^data:image\/svg\+xml/i.test(url)) {
    return undefined
  }

  if (/^https?:\/\//i.test(url)) {
    return url
  }

  if (!base) {
    return url
  }

  try {
    if (url.startsWith('//')) {
      const protocol = new URL(base).protocol

      return `${protocol}${url}`
    }

    return new URL(url, base).href
  } catch {
    return url
  }
}

const image = (text: string, base?: string): string | undefined => {
  const patterns = [
    /<img[^>]{0,2000}?src=["']([^"']+)["']/i,
    /<img[^>]{0,2000}?src\s*=\s*["']([^"']+)["']/i,
    /<img[^>]{0,2000}?\s+src=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match?.[1]) {
      let url: string | undefined = match[1]

      url = html(url)

      url = absolute(url, base)

      if (url?.trim()) {
        return url
      }
    }
  }

  return undefined
}

const content = (entry: RawEntry): string | undefined => {
  const text = entry.content || entry['content:encoded']

  if (!text) {
    return undefined
  }

  return image(text, entry.link)
}

const extract = (entry: RawEntry): string | undefined => {
  const text = entry.summary

  if (!text) {
    return undefined
  }

  return image(text, entry.link)
}

export const thumbnail = (entry: RawEntry): string | undefined =>
  enclosure(entry) ||
  itunes(entry) ||
  media(entry) ||
  custom(entry) ||
  content(entry) ||
  extract(entry)

export const description = (entry: RawEntry): string | undefined => {
  if (entry.contentSnippet) {
    return entry.contentSnippet
  }

  if (entry.summary) {
    return entry.summary
  }

  const content = entry.content || entry['content:encoded']

  if (content) {
    const cleaned = content.replace(/<[^>]*>/g, '').trim()

    return cleaned || undefined
  }

  return undefined
}

export const date = (entry: RawEntry): Date | undefined => {
  if (entry.isoDate) {
    const trimmed = entry.isoDate.trim()

    if (!trimmed) {
      return undefined
    }

    const parsed = new Date(trimmed)

    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  if (entry.pubDate) {
    const trimmed = entry.pubDate.trim()

    if (!trimmed) {
      return undefined
    }

    const parsed = new Date(trimmed)

    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  return undefined
}

export const normalize = (entry: RawEntry): Entry => ({
  identifier: entry.guid,
  title: entry.title,
  description: description(entry),
  link: entry.link,
  thumbnail: thumbnail(entry),
  published: date(entry),
  creator: entry.creator,
  categories: entry.categories,
  snippet: entry.contentSnippet,
})
