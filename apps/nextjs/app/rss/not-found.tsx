import { StatusCodes } from 'http-status-codes'
import { Fallback } from './components'

export default function NotFound() {
  return <Fallback code={StatusCodes.NOT_FOUND} text="フィードがみつからないみたい..." />
}
