import { getReasonPhrase, StatusCodes } from 'http-status-codes'

import { Toaster, type ToastOption as BaseToastOption } from '@kit/providers'

export const RunMode = {
  Client: 'client',
  Server: 'server',
} as const

export type RunMode = (typeof RunMode)[keyof typeof RunMode]

export const StatusCategory = {
  NoFault: '2xx',
  ClientFault: '4xx',
  ServerFault: '5xx',
} as const

export type StatusCategory = (typeof StatusCategory)[keyof typeof StatusCategory]

export type Status = {
  value: StatusCodes
  label: string
  category: StatusCategory
}

export const Statuses: Status[] = [
  {
    value: StatusCodes.OK,
    label: `${StatusCodes.OK} ${getReasonPhrase(StatusCodes.OK)}`,
    category: StatusCategory.NoFault,
  },
  {
    value: StatusCodes.CREATED,
    label: `${StatusCodes.CREATED} ${getReasonPhrase(StatusCodes.CREATED)}`,
    category: StatusCategory.NoFault,
  },
  {
    value: StatusCodes.NO_CONTENT,
    label: `${StatusCodes.NO_CONTENT} ${getReasonPhrase(StatusCodes.NO_CONTENT)}`,
    category: StatusCategory.NoFault,
  },
  {
    value: StatusCodes.BAD_REQUEST,
    label: `${StatusCodes.BAD_REQUEST} ${getReasonPhrase(StatusCodes.BAD_REQUEST)}`,
    category: StatusCategory.ClientFault,
  },
  {
    value: StatusCodes.UNAUTHORIZED,
    label: `${StatusCodes.UNAUTHORIZED} ${getReasonPhrase(StatusCodes.UNAUTHORIZED)}`,
    category: StatusCategory.ClientFault,
  },
  {
    value: StatusCodes.FORBIDDEN,
    label: `${StatusCodes.FORBIDDEN} ${getReasonPhrase(StatusCodes.FORBIDDEN)}`,
    category: StatusCategory.ClientFault,
  },
  {
    value: StatusCodes.NOT_FOUND,
    label: `${StatusCodes.NOT_FOUND} ${getReasonPhrase(StatusCodes.NOT_FOUND)}`,
    category: StatusCategory.ClientFault,
  },
  {
    value: StatusCodes.INTERNAL_SERVER_ERROR,
    label: `${StatusCodes.INTERNAL_SERVER_ERROR} ${getReasonPhrase(
      StatusCodes.INTERNAL_SERVER_ERROR,
    )}`,
    category: StatusCategory.ServerFault,
  },
  {
    value: StatusCodes.BAD_GATEWAY,
    label: `${StatusCodes.BAD_GATEWAY} ${getReasonPhrase(StatusCodes.BAD_GATEWAY)}`,
    category: StatusCategory.ServerFault,
  },
  {
    value: StatusCodes.SERVICE_UNAVAILABLE,
    label: `${StatusCodes.SERVICE_UNAVAILABLE} ${getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE)}`,
    category: StatusCategory.ServerFault,
  },
]

export type Timeline = {
  kind: string
  timestamp: Date
}

export type Timelines = {
  [RunMode.Client]: Timeline[]
  [RunMode.Server]: Timeline[]
}

export const ToastKind = {
  Success: 'success',
  Failure: 'failure',
  Unauthorized: 'unauthorized',
} as const

export type ToastKind = (typeof ToastKind)[keyof typeof ToastKind]

export type ToastOption = BaseToastOption<{
  kind: ToastKind
  message: string
}>

export const toaster = new Toaster<ToastOption>({ max: 3 })
