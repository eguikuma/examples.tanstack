'use server'

import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import type { Outcome } from '@core/http'
import type { Feed } from '@core/rss'

import { channel } from './channel'
import { rss } from '../integrations/server'

export const find = async (slug: string): Promise<Outcome<Feed>> => {
  const found = channel(slug)

  if (!found) {
    return {
      success: false,
      status: StatusCodes.NOT_FOUND,
      message: getReasonPhrase(StatusCodes.NOT_FOUND),
    }
  }

  const response = await rss.get(found.url)

  return response
}
