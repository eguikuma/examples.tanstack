'use server'

import type { Outcome } from '@core/http'

import { Storage } from './storage'
import { enrich } from './transform'
import { HttpOptions } from '../integrations/options'
import { http } from '../integrations/server'
import type { Listed, PokemonCard } from '../models'

export const search = async (offset: number): Promise<Outcome<(PokemonCard | null)[]>> => {
  const response = await http.get<Listed>('/pokemon', {
    queries: { limit: HttpOptions.Limit, offset },
  })

  if (!response.success) {
    return response
  }

  const pokemons = await Promise.all(response.data.results.map(enrich))

  const data = pokemons.map((pokemon) =>
    pokemon
      ? {
          ...pokemon,
          liked: Storage.isLiked(pokemon.id),
        }
      : null,
  )

  return {
    success: response.success,
    status: response.status,
    data,
  }
}
