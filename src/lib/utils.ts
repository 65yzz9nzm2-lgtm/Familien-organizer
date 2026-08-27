import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amountInCents: number, currency = 'EUR', locale = 'de-DE') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountInCents / 100)
}

export function formatDate(date: string | Date, locale = 'de-DE') {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

/** Parses a locale-flexible money string ("48,70" or "48.70") into integer cents. */
export function parseCurrencyToCents(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}
