'use client'

import { useRouter } from 'next/navigation'
import type { PokemonCard } from '../models'
import { Pagination } from './pagination'
import { search } from '../services'
import { Card } from './card'
import { http } from '@shared/integrations/http/client'
import { HttpOptions } from '@shared/integrations/http/options'
import { Container, Head, Spinner, Title } from '@shared/components'

export const Dictionary = ({
  defaults,
  page,
  offset,
}: {
  defaults: PokemonCard[]
  page: number
  offset: number
}) => {
  const router = useRouter()

  const { data: pokemons, loading } = http.get(() => search(offset), {
    key: ['pokemons', page],
    defaults: page === 1 ? defaults : undefined,
  })

  const navigate = (page: number) => router.push(page === 1 ? '/http' : `/http?page=${page}`)

  return (
    <Container>
      <Head>
        <Title className="text-white bg-linear-to-r from-blue-500 via-green-500 to-red-500">
          ポケモン図鑑
        </Title>
      </Head>

      <div>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {pokemons && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {pokemons.map((pokemon) => (
                  <Card key={pokemon.id} pokemon={pokemon} page={page} />
                ))}
              </div>
            )}
            <Pagination
              page={page}
              more={(pokemons?.length ?? 0) >= HttpOptions.Limit}
              previous={() => navigate(Math.max(1, page - 1))}
              next={() => navigate(page + 1)}
            />
          </>
        )}
      </div>
    </Container>
  )
}
