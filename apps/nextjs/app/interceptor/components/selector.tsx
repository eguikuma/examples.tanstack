'use client'

import { useState } from 'react'

import { StatusCodes } from 'http-status-codes'

import { Dropdown, Toggle, Trigger } from '@kit/components'

import { RunMode, Statuses } from '../models'

export const Selector = ({
  loading,
  onSend,
}: {
  loading: boolean
  onSend: (code: number, mode: RunMode) => void
}) => {
  const [code, setCode] = useState(StatusCodes.OK)
  const [mode, setMode] = useState<RunMode>(RunMode.Client)

  return (
    <section className="bg-white border-4 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] p-6">
      <h2 className="text-2xl wrap-anywhere font-bold mb-4 text-gray-900">
        ステータスコードを選択
      </h2>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col-reverse md:flex-row items-center gap-4">
          <Dropdown
            className="w-full md:max-w-md"
            options={Statuses.map((status) => ({ value: status.value, label: status.label }))}
            value={code}
            button={{ className: 'focus:ring-purple-300' }}
            selected={{ className: 'bg-purple-100' }}
            onChange={setCode}
          />

          <Toggle
            className="w-full md:w-auto"
            options={[
              { value: RunMode.Client, label: 'クライアント' },
              { value: RunMode.Server, label: 'サーバー' },
            ]}
            value={mode}
            active={{ className: 'bg-purple-500 text-white' }}
            onChange={setMode}
          />
        </div>

        <Trigger kind="button" onClick={() => onSend(code, mode)} disabled={loading}>
          送信
        </Trigger>
      </div>
    </section>
  )
}
