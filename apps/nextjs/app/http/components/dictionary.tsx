'use client'

import { useRouter } from 'next/navigation'

import { Container, Head, Spinner, Title } from '@kit/components'
import { equal, greaterThanOrEqual } from '@kit/predicates'

import { Pagination } from './pagination'
import { search } from '../services'
import { Card } from './card'
import { Unavailable } from './unavailable'
import { http } from '../integrations/client'
import { HttpOptions } from '../integrations/options'
import type { PokemonCard } from '../models'

export const Dictionary = ({
  defaults,
  page,
  offset,
}: {
  defaults: (PokemonCard | null)[]
  page: number
  offset: number
}) => {
  const router = useRouter()

  const { data: pokemons, loading } = http.get(() => search(offset), {
    key: ['pokemons', page],
    defaults: equal(page, 1) ? defaults : undefined,
  })

  const navigate = (page: number) => router.push(`/http?page=${page}`)

  return (
    <Container>
      <Head>
        <Title className="text-white bg-linear-to-r from-blue-500 via-green-500 to-red-500">
          HTTP
        </Title>
      </Head>

      <div>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {pokemons && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {pokemons.map((pokemon) =>
                  pokemon ? (
                    <Card key={pokemon.id} pokemon={pokemon} page={page} />
                  ) : (
                    <Unavailable key={`unavailable-${Date.now()}`} />
                  ),
                )}
              </div>
            )}
            <Pagination
              page={page}
              more={greaterThanOrEqual(pokemons?.length ?? 0, HttpOptions.Limit)}
              previous={() => navigate(Math.max(1, page - 1))}
              next={() => navigate(page + 1)}
            />
          </>
        )}
      </div>
    </Container>
  )
}
