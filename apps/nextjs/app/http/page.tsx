import { StatusCodes } from 'http-status-codes'
import { Dictionary, Fallback } from './components'
import { search } from './services'
import { HttpOptions } from '@shared/integrations/http/options'

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const offset = (current - 1) * HttpOptions.Limit

  const result = await search(offset)

  if (!result.success) {
    return <Fallback code={result.status} text="ポケモンセンターとつながらないみたい..." />
  }

  if (result.data.length === 0) {
    return <Fallback code={StatusCodes.NOT_FOUND} text="ポケモンがみつからないみたい..." />
  }

  return <Dictionary defaults={result.data} page={current} offset={offset} />
}
