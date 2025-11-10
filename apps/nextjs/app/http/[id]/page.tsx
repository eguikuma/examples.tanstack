import { find } from '../services'
import { Fallback, Profile } from '../components'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page } = await searchParams
  const current = Math.max(1, Number(page) || 1)
  const result = await find(id)

  if (!result.success) {
    return <Fallback code={result.status} text="ポケモンセンターとつながらないみたい..." />
  }

  return <Profile profile={result.data} page={current} />
}
