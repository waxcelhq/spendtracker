import { useContext } from 'react'
import { bucketUnit, buildBuckets, resolveRange } from '../lib/periods'
import { PeriodContext } from './context'

export function usePeriod() {
  const period = useContext(PeriodContext)
  if (!period) throw new Error('usePeriod must be used within PeriodProvider')
  return period
}

export function useResolvedPeriod() {
  const period = usePeriod()
  const range = resolveRange(period)
  const buckets = range ? buildBuckets(range, bucketUnit(period.id, range)) : []
  return { period, range, buckets }
}
