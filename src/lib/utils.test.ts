import { describe, expect, it } from 'vitest'
import { formatCurrency, parseCurrencyToCents } from './utils'

describe('parseCurrencyToCents', () => {
  it('parses German decimal notation (comma)', () => {
    expect(parseCurrencyToCents('48,70')).toBe(4_870)
  })

  it('parses a whole-euro amount', () => {
    expect(parseCurrencyToCents('50')).toBe(5_000)
  })

  it('rejects negative amounts', () => {
    expect(parseCurrencyToCents('-5')).toBeNull()
  })

  it('rejects garbage input', () => {
    expect(parseCurrencyToCents('abc')).toBeNull()
    expect(parseCurrencyToCents('')).toBeNull()
  })
})

describe('formatCurrency', () => {
  it('formats integer cents as EUR using German locale', () => {
    expect(formatCurrency(487_000)).toContain('4.870')
  })
})
