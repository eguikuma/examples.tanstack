import { type NextRequest, NextResponse } from 'next/server'
import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { dislike } from '@/http/services'

export const DELETE = async (
  _request: NextRequest,
  context: RouteContext<'/api/favorites/[id]'>,
) => {
  try {
    const id = Number((await context.params).id)

    if (Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message: getReasonPhrase(StatusCodes.BAD_REQUEST),
        },
        { status: StatusCodes.BAD_REQUEST },
      )
    }

    if (!dislike(id)) {
      return NextResponse.json(
        {
          success: false,
          message: getReasonPhrase(StatusCodes.NOT_FOUND),
        },
        { status: StatusCodes.NOT_FOUND },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id },
    })
  } catch (_thrown) {
    return NextResponse.json(
      {
        success: false,
        message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    )
  }
}
