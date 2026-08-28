import { describe, expect, it } from 'vitest'
import {
  aggregateByMonth,
  budgetStatus,
  intervalToMonths,
  monthlyReserveCents,
  savingsRate,
  totalAnnualCents,
  totalMonthlyReserveCents,
} from './finance-calculations'

describe('intervalToMonths', () => {
  it('maps standard intervals to their month count', () => {
    expect(intervalToMonths('monthly')).toBe(1)
    expect(intervalToMonths('bimonthly')).toBe(2)
    expect(intervalToMonths('quarterly')).toBe(3)
    expect(intervalToMonths('semiannual')).toBe(6)
    expect(intervalToMonths('annual')).toBe(12)
  })

  it('uses the custom month count for custom intervals', () => {
    expect(intervalToMonths('custom', 4)).toBe(4)
  })

  it('throws for a custom interval without a valid month count', () => {
    expect(() => intervalToMonths('custom', null)).toThrow()
    expect(() => intervalToMonths('custom', 0)).toThrow()
  })
})

describe('monthlyReserveCents', () => {
  it('splits an annual cost of 780,00 EUR into 65,00 EUR / month', () => {
    // The example from the spec: Autoversicherung 780€/Jahr -> 65€/Monat reserve.
    expect(monthlyReserveCents(78_000, 'annual')).toBe(6_500)
  })

  it('rounds to the nearest cent instead of truncating', () => {
    // 100 EUR / 3 months = 33.33... -> rounds to 3333 cents, not 3300.
    expect(monthlyReserveCents(10_000, 'quarterly')).toBe(3_333)
  })

  it('supports custom intervals', () => {
    expect(monthlyReserveCents(24_00, 'custom', 4)).toBe(600)
  })
})

describe('totalMonthlyReserveCents / totalAnnualCents', () => {
  const costs = [
    { amount_cents: 78_000, interval: 'annual' as const },
    { amount_cents: 24_000, interval: 'annual' as const },
    { amount_cents: 4_500, interval: 'monthly' as const },
  ]

  it('sums the monthly reserve across multiple recurring costs', () => {
    // (78000 + 24000) / 12 + 4500 = 8500 + 4500 = 13000
    expect(totalMonthlyReserveCents(costs)).toBe(13_000)
  })

  it('sums the annualized cost across multiple recurring costs', () => {
    // 78000 + 24000 + 4500*12 = 156000
    expect(totalAnnualCents(costs)).toBe(156_000)
  })
})

describe('budgetStatus (Finanz-Ampel)', () => {
  it('is green under 80% of the budget', () => {
    expect(budgetStatus(50_00, 100_00)).toBe('green')
    expect(budgetStatus(79_99, 100_00)).toBe('green')
  })

  it('is yellow between 80% and 100%', () => {
    expect(budgetStatus(80_00, 100_00)).toBe('yellow')
    expect(budgetStatus(100_00, 100_00)).toBe('yellow')
  })

  it('is red once spending exceeds the budget', () => {
    expect(budgetStatus(100_01, 100_00)).toBe('red')
  })

  it('treats any spending against a zero budget as red', () => {
    expect(budgetStatus(1, 0)).toBe('red')
    expect(budgetStatus(0, 0)).toBe('green')
  })
})

describe('savingsRate', () => {
  it('computes the fraction of income that was saved', () => {
    expect(savingsRate(500_00, 400_00)).toBeCloseTo(0.2)
  })

  it('never goes negative when expenses exceed income', () => {
    expect(savingsRate(100_00, 200_00)).toBe(0)
  })

  it('is 0 when there is no income', () => {
    expect(savingsRate(0, 0)).toBe(0)
  })
})

describe('aggregateByMonth', () => {
  it('sums expenses and income into the same bucket per calendar month', () => {
    const expenses = [
      { occurred_on: '2026-01-05', amount_cents: 1000 },
      { occurred_on: '2026-01-20', amount_cents: 500 },
      { occurred_on: '2026-02-01', amount_cents: 2000 },
    ]
    const income = [
      { occurred_on: '2026-01-01', amount_cents: 380000 },
      { occurred_on: '2026-02-01', amount_cents: 380000 },
    ]

    expect(aggregateByMonth(expenses, income)).toEqual([
      { monthKey: '2026-01', incomeCents: 380000, expenseCents: 1500 },
      { monthKey: '2026-02', incomeCents: 380000, expenseCents: 2000 },
    ])
  })

  it('returns months in chronological order regardless of input order', () => {
    const expenses = [
      { occurred_on: '2026-03-01', amount_cents: 1 },
      { occurred_on: '2026-01-01', amount_cents: 1 },
      { occurred_on: '2026-02-01', amount_cents: 1 },
    ]
    expect(aggregateByMonth(expenses, []).map((m) => m.monthKey)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('returns an empty array for no transactions', () => {
    expect(aggregateByMonth([], [])).toEqual([])
  })

  it('creates a month bucket for an income-only month with no expenses', () => {
    const result = aggregateByMonth([], [{ occurred_on: '2026-05-01', amount_cents: 100 }])
    expect(result).toEqual([{ monthKey: '2026-05', incomeCents: 100, expenseCents: 0 }])
  })
})
