export type CurrencyOption = {
  code: string
  label: string
  flag: string
  symbol: string
}

const MAJOR_CURRENCIES = [
  'NGN',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'CAD',
  'AUD',
  'CHF',
  'HKD',
  'SGD',
  'INR',
  'ZAR',
]

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const symbols = new Map<string, string>()

function regionForCurrency(code: string): string | null {
  if (code.startsWith('X')) return null
  const guess = code.slice(0, 2)
  try {
    const name = regionNames.of(guess)
    if (!name || name.toUpperCase() === guess || name.startsWith('Pseudo')) return null
    return guess
  } catch {
    return null
  }
}

export function currencyFlag(code: string): string {
  const region = regionForCurrency(code)
  if (!region) return ''
  return [...region].map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65)).join('')
}

export function currencySymbol(code: string): string {
  const cached = symbols.get(code)
  if (cached) return cached
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(1)
      .find((item) => item.type === 'currency')
    const symbol = part?.value ?? code
    symbols.set(code, symbol)
    return symbol
  } catch {
    symbols.set(code, code)
    return code
  }
}

let options: CurrencyOption[] | null = null

export function currencyOptions(): CurrencyOption[] {
  if (options) return options
  const names = new Intl.DisplayNames(['en'], { type: 'currency' })
  options = MAJOR_CURRENCIES.map((code) => ({
    code,
    label: `${code} — ${names.of(code) ?? code}`,
    flag: currencyFlag(code),
    symbol: currencySymbol(code),
  }))
  return options
}

export function currencyOption(code: string): CurrencyOption {
  return (
    currencyOptions().find((option) => option.code === code) ?? {
      code,
      label: code,
      flag: currencyFlag(code),
      symbol: currencySymbol(code),
    }
  )
}
