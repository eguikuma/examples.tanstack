export type Intercepted = {
  message: string
  timestamp: string
}

export type Snapshot = {
  request: {
    before: object
    after: object
  }
  response: {
    status: number | null
    [key: string]: unknown
  }
  on: {
    timelines: {
      kind: string
      timestamp: Date
    }[]
  }
}
