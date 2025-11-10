import { injector, monitor, type Outcome, server } from '@core/http'

import { ToastKind, type Intercepted, type Snapshot, toaster } from '../models'

const snapshot: Snapshot = {
  request: {
    before: {},
    after: {},
  },
  response: {
    status: null,
  },
  on: {
    timelines: [],
  },
}

export const interceptor = server({
  base: 'http://localhost:3000/api/interceptors',
  localhost: true,
  interceptors: {
    request: [
      monitor.requested({
        observer: (context) => {
          snapshot.request.before = context.options.headers || {}
        },
      }),
      injector({
        headers: () => ({
          'X-Server-Request': crypto.randomUUID(),
          'X-Server-Timestamp': new Date().toISOString(),
        }),
      }),
      monitor.requested({
        observer: (context) => {
          snapshot.request.after = context.options.headers || {}
        },
      }),
    ],
    response: [
      monitor.responded({
        observer: async (context) => {
          snapshot.response = context.outcome as Outcome<Intercepted>
        },
      }),
    ],
    on: {
      success: () => {
        toaster.add({
          kind: ToastKind.Success,
          message: 'リクエストが成功しました',
        })

        snapshot.on.timelines.unshift({
          kind: ToastKind.Success,
          timestamp: new Date(),
        })
      },
      failure: () => {
        toaster.add({
          kind: ToastKind.Failure,
          message: 'リクエストが失敗しました',
        })

        snapshot.on.timelines.unshift({
          kind: ToastKind.Failure,
          timestamp: new Date(),
        })
      },
      unauthorized: () => {
        toaster.add({
          kind: ToastKind.Unauthorized,
          message: '認証が必要です',
        })

        snapshot.on.timelines.unshift({
          kind: ToastKind.Unauthorized,
          timestamp: new Date(),
        })
      },
    },
  },
})

export const captured = () => snapshot

export const clear = () => {
  snapshot.request.before = {}
  snapshot.request.after = {}
  snapshot.response.status = null
}
