import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import * as Http from '../http/server'
import type { Feed } from './core/models'
import { FeedParser } from './core/parser'
import { unify } from '../http/core/helpers'
import type { DefaultBase, ExtendedBase, HttpOptions, Outcome } from '../http/core/models'

export type GetSource<Base extends string> = Http.GetSource<Base, string>

type Methods<Base extends string> = {
  get: (source: GetSource<Base>) => Promise<Outcome<Feed>>
}

export type Builder<Base extends string> = Methods<Base> & {
  extend: <const Extended extends Partial<HttpOptions>>(
    extended: Extended,
  ) => Builder<ExtendedBase<Base, Extended>>
}

const builder = <Base extends string>(http: Http.Builder<Base>): Builder<Base> => {
  const parser = new FeedParser()

  const get = async (source: GetSource<Base>): Promise<Outcome<Feed>> => {
    const response = await unify<string, []>({
      source,
      executor: (endpoint) => http.get(endpoint),
    })

    if (!response.success) {
      return response
    }

    try {
      const feed = await parser.parse(response.data)

      return {
        success: true,
        status: response.status,
        data: feed,
      }
    } catch (thrown) {
      return {
        success: false,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message:
          thrown instanceof Error
            ? thrown.message
            : getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      }
    }
  }

  return {
    get,
    extend: <const Extended extends Partial<HttpOptions>>(extended: Extended) =>
      builder(http.extend(extended)),
  }
}

export const server = <const Options extends Partial<HttpOptions>>(
  options?: Options,
): Builder<ExtendedBase<DefaultBase, Options>> =>
  builder(
    Http.server({
      ...options,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
        ...options?.headers,
      },
    }) as Http.Builder<ExtendedBase<DefaultBase, Options>>,
  )
