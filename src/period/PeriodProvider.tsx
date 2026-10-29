import { useMemo, useState, type ReactNode } from 'react'
import { toDateInput } from '../lib/dates'
import type { PeriodId } from '../lib/periods'
import { PeriodContext, type PeriodState } from './context'

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<PeriodId>('this-month')
  const [from, setFrom] = useState(() => {
    const now = new Date()
    return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo] = useState(() => toDateInput(new Date()))

  const value = useMemo<PeriodState>(
    () => ({ id, from, to, setId, setFrom, setTo }),
    [id, from, to],
  )

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}
