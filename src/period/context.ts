import { createContext } from 'react'
import type { PeriodId } from '../lib/periods'

export type PeriodState = {
  id: PeriodId
  from: string
  to: string
  setId: (id: PeriodId) => void
  setFrom: (value: string) => void
  setTo: (value: string) => void
}

export const PeriodContext = createContext<PeriodState | null>(null)
