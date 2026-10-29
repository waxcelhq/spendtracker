import { useLiveQuery } from 'dexie-react-hooks'
import { readCategories, readEntries } from '../vault/store'

export function useLedger() {
  const categories = useLiveQuery(() => readCategories(), [])
  const entries = useLiveQuery(() => readEntries(), [])
  return {
    categories,
    entries,
    ready: categories !== undefined && entries !== undefined,
  }
}
