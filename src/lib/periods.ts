import { addDays, startOfDay } from './dates'

export const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This week' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'this-year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
] as const

export type PeriodId = (typeof PERIODS)[number]['id']

export type DateRange = {
  start: Date
  end: Date
}

export type Bucket = {
  start: Date
  end: Date
  label: string
}

export type BucketUnit = 'day' | 'week' | 'month'

export function startOfWeek(date: Date): Date {
  const start = startOfDay(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  return start
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function earlier(a: Date, b: Date): Date {
  return a < b ? a : b
}

export function resolveRange(
  period: { id: PeriodId; from: string; to: string },
  now = new Date(),
): DateRange | null {
  if (period.id === 'custom') {
    const start = parseDateInput(period.from)
    const endDay = parseDateInput(period.to)
    if (!start || !endDay || start > endDay) return null
    return { start, end: addDays(endDay, 1) }
  }

  if (period.id === 'today') {
    const start = startOfDay(now)
    return { start, end: addDays(start, 1) }
  }

  if (period.id === 'this-week') {
    const start = startOfWeek(now)
    return { start, end: addDays(start, 7) }
  }

  if (period.id === 'this-month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    }
  }

  if (period.id === 'this-year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    }
  }

  const months = period.id === 'last-3-months' ? -3 : -6
  return {
    start: startOfDay(addMonths(now, months)),
    end: addDays(startOfDay(now), 1),
  }
}

function spansYears(range: DateRange): boolean {
  const last = new Date(range.end.getTime() - 1)
  return range.start.getFullYear() !== last.getFullYear()
}

function dayLabel(date: Date, withYear: boolean): string {
  return new Intl.DateTimeFormat(
    'en-NG',
    withYear ? { day: 'numeric', month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
  ).format(date)
}

function monthLabel(date: Date, withYear: boolean): string {
  return new Intl.DateTimeFormat(
    'en-NG',
    withYear ? { month: 'short', year: '2-digit' } : { month: 'short' },
  ).format(date)
}

export function bucketUnit(periodId: PeriodId, range: DateRange): BucketUnit {
  if (periodId === 'today' || periodId === 'this-week' || periodId === 'this-month') return 'day'
  if (periodId === 'last-3-months' || periodId === 'last-6-months') return 'week'
  if (periodId === 'this-year') return 'month'
  const days = (range.end.getTime() - range.start.getTime()) / 86_400_000
  if (days <= 31) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

export function buildBuckets(range: DateRange, unit: BucketUnit): Bucket[] {
  const withYear = spansYears(range)
  const buckets: Bucket[] = []

  if (unit === 'day') {
    let cursor = startOfDay(range.start)
    while (cursor < range.end) {
      const next = addDays(cursor, 1)
      buckets.push({
        start: cursor,
        end: earlier(next, range.end),
        label: dayLabel(cursor, withYear),
      })
      cursor = next
    }
    return buckets
  }

  if (unit === 'week') {
    let cursor = new Date(range.start)
    while (cursor < range.end) {
      const weekEnd = addDays(startOfWeek(cursor), 7)
      const end = earlier(weekEnd, range.end)
      if (end.getTime() === cursor.getTime()) break
      buckets.push({ start: cursor, end, label: dayLabel(cursor, withYear) })
      cursor = end
    }
    return buckets
  }

  let cursor = new Date(range.start)
  while (cursor < range.end) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const end = earlier(monthEnd, range.end)
    if (end.getTime() === cursor.getTime()) break
    buckets.push({ start: cursor, end, label: monthLabel(cursor, withYear) })
    cursor = end
  }
  return buckets
}
