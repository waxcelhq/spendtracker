import Decimal from 'decimal.js'

const fractionDigits = new Map<string, number>()

export function parseAmount(input: string): Decimal | null {
  const cleaned = input.trim().replace(/,/g, '').replace(/^\+/, '')
  if (!cleaned) return null
  try {
    const value = new Decimal(cleaned)
    if (!value.isFinite() || value.lte(0)) return null
    return value
  } catch {
    return null
  }
}

export function currencyFractionDigits(currency: string): number {
  const cached = fractionDigits.get(currency)
  if (cached !== undefined) return cached
  try {
    const digits =
      new Intl.NumberFormat('en-NG', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    fractionDigits.set(currency, digits)
    return digits
  } catch {
    fractionDigits.set(currency, 2)
    return 2
  }
}

export function formatMoney(amount: string | number | Decimal, currency: string): string {
  const value = amount instanceof Decimal ? amount : new Decimal(amount)
  const digits = currencyFractionDigits(currency)
  const rounded = value.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP)
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(rounded.toNumber())
  } catch {
    return `${currency} ${rounded.toFixed(digits)}`
  }
}

export function formatAxisAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export function toChartNumber(amount: Decimal): number {
  return amount.toNumber()
}

function groupInteger(whole: string): string {
  const normalized = whole.replace(/^0+(?=\d)/, '')
  return (normalized || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatAmountInput(raw: string, currency: string): string {
  const digits = currencyFractionDigits(currency)
  let cleaned = raw.replace(/[^\d.]/g, '')
  if (digits === 0) cleaned = cleaned.replace(/\./g, '')
  if (!cleaned) return ''

  const dot = cleaned.indexOf('.')
  const whole = dot === -1 ? cleaned : cleaned.slice(0, dot)
  const frac = dot === -1 ? undefined : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, digits)
  const grouped = groupInteger(whole || (dot === -1 ? '' : '0'))
  if (frac === undefined) return dot !== -1 && digits > 0 ? `${grouped}.` : grouped
  return `${grouped}.${frac}`
}

export function formatAmountFixed(raw: string, currency: string): string {
  const parsed = parseAmount(raw)
  if (!parsed) return formatAmountInput(raw, currency)
  const digits = currencyFractionDigits(currency)
  const fixed = parsed.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP).toFixed(digits)
  const [whole, frac] = fixed.split('.')
  const grouped = groupInteger(whole ?? '0')
  return frac !== undefined ? `${grouped}.${frac}` : grouped
}

export function amountCaret(formatted: string, digitsBefore: number, typedDot: boolean): number {
  if (typedDot) {
    const dot = formatted.indexOf('.')
    return dot === -1 ? formatted.length : dot + 1
  }
  if (digitsBefore <= 0) return 0
  let count = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) count += 1
    if (count === digitsBefore) return index + 1
  }
  return formatted.length
}
