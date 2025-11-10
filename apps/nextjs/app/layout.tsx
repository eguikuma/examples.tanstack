import { Nunito } from 'next/font/google'
import './globals.css'
import type { PropsWithChildren } from 'react'
import { TanstackQuery } from '@shared/providers'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
})

export default function Layout({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <body
        className={`${nunito.variable} min-h-screen bg-linear-to-br from-blue-100 via-purple-100 to-pink-100`}
      >
        <TanstackQuery>{children}</TanstackQuery>
      </body>
    </html>
  )
}
