import type { RequestInterceptor, ResponseInterceptor } from '../models'

export type MonitorOptions = {
  logger: (message: string, data?: unknown) => void
}

const requester = (options: MonitorOptions): RequestInterceptor => {
  return (context) => {
    options.logger(`${context.method} ${context.endpoint}`, {
      options: context.options,
      body: context.body,
    })
    return context
  }
}

const responder = (options: MonitorOptions): ResponseInterceptor => {
  return (context) => {
    options.logger(`${context.response.status} ${context.response.url}`, context.data)
    return context
  }
}

export const monitor = {
  requester,
  responder,
}
