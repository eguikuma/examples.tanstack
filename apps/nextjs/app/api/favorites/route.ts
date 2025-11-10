import { type NextRequest, NextResponse } from 'next/server'
import { getReasonPhrase, StatusCodes } from 'http-status-codes'
import { like, liked } from '@/http/services'

export const POST = async (request: NextRequest) => {
  try {
    const id = Number((await request.json()).id)

    if (Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message: getReasonPhrase(StatusCodes.BAD_REQUEST),
        },
        { status: StatusCodes.BAD_REQUEST },
      )
    }

    if (liked(id)) {
      return NextResponse.json(
        {
          success: false,
          message: getReasonPhrase(StatusCodes.CONFLICT),
        },
        { status: StatusCodes.CONFLICT },
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: like(id),
      },
      { status: StatusCodes.CREATED },
    )
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
