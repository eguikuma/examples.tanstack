'use server'

import type { Listed, PokemonCard } from '../models'
import { enrich } from './transform'
import { liked } from './storage'
import { http } from '@shared/integrations/http/server'
import { HttpOptions } from '@shared/integrations/http/options'
import type { Result } from '@core/http/core'

export const search = async (offset: number): Promise<Result<PokemonCard[]>> => {
  const result = await http.get<Listed>('/pokemon', {
    queries: { limit: HttpOptions.Limit, offset },
  })

  if (!result.success) {
    return result
  }

  const pokemons = await Promise.all(result.data.results.map(enrich))

  const data: PokemonCard[] = []
  for (const pokemon of pokemons) {
    if (pokemon !== null) {
      data.push({
        ...pokemon,
        liked: liked(pokemon.id),
      })
    }
  }

  return {
    success: result.success,
    status: result.status,
    data,
  }
}
