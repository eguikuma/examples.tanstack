'use server'

import type { Found, PokemonProfile, Translated } from '../models'
import { hiragana, japanese } from './translation'
import { identifier } from './transform'
import { liked } from './storage'
import { http } from '@shared/integrations/http/server'
import type { Result } from '@core/http/core'

export const find = async (id: string): Promise<Result<PokemonProfile>> => {
  const [response, languages] = await Promise.all([
    http.get<Found>(`/pokemon/${id}`),
    http.get<Translated>(`/pokemon-species/${id}`),
  ])

  if (!response.success) {
    return response
  }

  const pokemon = response.data
  const translation = languages.success ? japanese(languages.data.names) : undefined

  const [types, statistics, abilities] = await Promise.all([
    Promise.all(
      pokemon.types.map(async (entry: { type: { name: string; url: string } }) => {
        const id = identifier(entry.type.url)
        const result = await http.get<Translated>(`/type/${id}`)

        return {
          name: entry.type.name,
          translation: result.success ? japanese(result.data.names) : undefined,
        }
      }),
    ),
    Promise.all(
      pokemon.stats.map(
        async (entry: { base_stat: number; stat: { name: string; url: string } }) => {
          const id = identifier(entry.stat.url)
          const result = await http.get<Translated>(`/stat/${id}`)

          return {
            value: entry.base_stat,
            name: entry.stat.name,
            translation: result.success ? hiragana(result.data.names) : undefined,
          }
        },
      ),
    ),
    Promise.all(
      pokemon.abilities.map(async (entry: { ability: { name: string; url: string } }) => {
        const id = identifier(entry.ability.url)
        const result = await http.get<Translated>(`/ability/${id}`)

        return {
          name: entry.ability.name,
          translation: result.success ? japanese(result.data.names) : undefined,
        }
      }),
    ),
  ])

  return {
    success: response.success,
    status: response.status,
    data: {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      image: pokemon.sprites.other['official-artwork'].front_default,
      translation,
      types,
      statistics,
      abilities,
      liked: liked(pokemon.id),
    },
  }
}
