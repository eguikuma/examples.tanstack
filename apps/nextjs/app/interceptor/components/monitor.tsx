'use client'

import { useState } from 'react'

import { Container, Head, Title, useToast } from '@kit/components'

import { On } from './on'
import { Request } from './request'
import { Response } from './response'
import { Selector } from './selector'
import { Toast } from './toast'
import * as client from '../integrations/client'
import * as server from '../integrations/server'
import { RunMode, type Timelines, type Snapshot, toaster } from '../models'

export const Monitor = () => {
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [timelines, setTimelines] = useState<Timelines>({
    [RunMode.Client]: [],
    [RunMode.Server]: [],
  })
  const [loading, setLoading] = useState(false)

  const toast = useToast(toaster)

  const handlers = {
    [RunMode.Client]: client.interceptor.post((code: number) => `/${code}`, {}).handlers.execute,
    [RunMode.Server]: server.interceptor.post,
  }

  const send = async (code: number, mode: RunMode) => {
    if (loading) return

    try {
      setLoading(true)

      let snapshot: Snapshot

      switch (mode) {
        case RunMode.Client:
          client.clear()

          await handlers[mode](code)

          snapshot = client.captured()

          break
        case RunMode.Server:
          server.clear()

          await handlers[mode](`/${code}`)

          snapshot = server.captured()

          break
        default:
          throw new Error()
      }

      setSnapshot(snapshot)

      setTimelines((previous) => ({
        ...previous,
        [mode]: snapshot.on.timelines,
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Head>
        <Title className="text-white bg-linear-to-r from-purple-400 via-purple-600 to-purple-800">
          Interceptor
        </Title>
      </Head>

      <div className="space-y-8">
        <Selector loading={loading} onSend={send} />

        <Request {...(snapshot ? snapshot.request : { before: {}, after: {} })} />

        <Response {...(snapshot ? snapshot.response : { status: null })} />

        <On {...timelines} />
      </div>

      <Toast options={toast.options} />
    </Container>
  )
}
