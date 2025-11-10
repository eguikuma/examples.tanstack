import type { HttpOptions } from './models'

export const HttpDefaultOptions: HttpOptions = {
  base: '',
  timeout: 10000,
  credentials: 'same-origin',
} as const
