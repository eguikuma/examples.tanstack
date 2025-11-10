type Storage = {
  favorites: {
    id: number
  }[]
}

declare global {
  var SharedStorage: Storage | undefined
}

const Storage: Storage = globalThis.SharedStorage ?? {
  favorites: [],
}

globalThis.SharedStorage = Storage

export const liked = (id: number) => !!Storage.favorites.find((favorite) => favorite.id === id)

export const like = (id: number) => {
  const data = {
    id: id,
  }

  Storage.favorites.push(data)

  return data
}

export const dislike = (id: number) => {
  const index = Storage.favorites.findIndex((favorite) => favorite.id === id)

  if (index === -1) {
    return false
  }

  Storage.favorites.splice(index, 1)

  return true
}
