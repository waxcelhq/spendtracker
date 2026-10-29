import Decimal from 'decimal.js'
import type { Category, Entry, TransactionType } from '../db/types'
import type { Bucket, DateRange } from './periods'

export type CurrencyTotals = {
  currency: string
  credit: Decimal
  debit: Decimal
  balance: Decimal
}

export type CategoryTotal = {
  id: string
  label: string
  total: Decimal
}

export type SeriesPoint = {
  label: string
  total: Decimal
}

function inRange(iso: string, range: DateRange): boolean {
  const time = new Date(iso).getTime()
  return time >= range.start.getTime() && time < range.end.getTime()
}

export function entriesInRange(entries: Entry[], range: DateRange): Entry[] {
  return entries.filter((entry) => inRange(entry.occurredAt, range))
}

function compareCurrency(a: string, b: string): number {
  if (a === b) return 0
  if (a === 'NGN') return -1
  if (b === 'NGN') return 1
  return a.localeCompare(b)
}

export function totalsByCurrency(entries: Entry[], range: DateRange): CurrencyTotals[] {
  const grouped = new Map<string, { credit: Decimal; debit: Decimal }>()
  for (const entry of entriesInRange(entries, range)) {
    const current = grouped.get(entry.currency) ?? { credit: new Decimal(0), debit: new Decimal(0) }
    const amount = new Decimal(entry.amount)
    if (entry.type === 'credit') current.credit = current.credit.plus(amount)
    else current.debit = current.debit.plus(amount)
    grouped.set(entry.currency, current)
  }

  return [...grouped.entries()]
    .map(([currency, totals]) => ({
      currency,
      credit: totals.credit,
      debit: totals.debit,
      balance: totals.credit.minus(totals.debit),
    }))
    .sort((a, b) => compareCurrency(a.currency, b.currency))
}

export function categoryTotals(
  entries: Entry[],
  range: DateRange,
  currency: string,
  type: TransactionType,
  categories: Category[],
): CategoryTotal[] {
  const names = new Map(categories.map((category) => [category.id, category.name]))
  const grouped = new Map<string, Decimal>()
  for (const entry of entriesInRange(entries, range)) {
    if (entry.currency !== currency || entry.type !== type) continue
    const key = entry.categoryId ?? ''
    grouped.set(key, (grouped.get(key) ?? new Decimal(0)).plus(entry.amount))
  }

  return [...grouped.entries()]
    .filter(([, total]) => total.gt(0))
    .map(([id, total]) => ({
      id: id || 'uncategorized',
      label: id ? (names.get(id) ?? 'Uncategorized') : 'Uncategorized',
      total,
    }))
    .sort((a, b) => b.total.cmp(a.total))
}

export function timeSeries(
  entries: Entry[],
  buckets: Bucket[],
  currency: string,
  type: TransactionType,
): SeriesPoint[] {
  return buckets.map((bucket) => {
    let total = new Decimal(0)
    for (const entry of entries) {
      if (entry.currency !== currency || entry.type !== type) continue
      const time = new Date(entry.occurredAt).getTime()
      if (time >= bucket.start.getTime() && time < bucket.end.getTime()) {
        total = total.plus(entry.amount)
      }
    }
    return { label: bucket.label, total }
  })
}

export function currenciesInRange(entries: Entry[], range: DateRange): string[] {
  return totalsByCurrency(entries, range).map((totals) => totals.currency)
}
