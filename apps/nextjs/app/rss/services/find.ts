'use server'

import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { channel } from './channel'
import { rss } from '@shared/integrations/rss/server'
import type { Result } from '@core/http/core'
import type { Feed } from '@core/rss/core'

export const find = async (slug: string): Promise<Result<Feed>> => {
  const found = channel(slug)

  if (!found) {
    return {
      success: false,
      status: StatusCodes.NOT_FOUND,
      message: getReasonPhrase(StatusCodes.NOT_FOUND),
    }
  }

  const result = await rss.get(found.url)

  if (!result.success) {
    return result
  }

  return {
    success: true,
    status: result.status,
    data: result.data,
  }
}
