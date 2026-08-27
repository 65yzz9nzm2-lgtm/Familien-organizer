import type { RecurrenceInterval } from '@/types/database.types'

const INTERVAL_MONTHS: Record<Exclude<RecurrenceInterval, 'custom'>, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

/** How many months a recurrence interval spans, e.g. 'annual' -> 12. */
export function intervalToMonths(interval: RecurrenceInterval, customMonths?: number | null): number {
  if (interval === 'custom') {
    if (!customMonths || customMonths <= 0) {
      throw new Error('custom interval requires a positive customMonths value')
    }
    return customMonths
  }
  return INTERVAL_MONTHS[interval]
}

/**
 * Monthly reserve for a single recurring cost, in integer cents.
 * Example: 780,00 EUR/year -> 6500 cents/month (not 65.0000...).
 * Rounds to the nearest cent so a set of reserves sums predictably.
 */
export function monthlyReserveCents(amountCents: number, interval: RecurrenceInterval, customMonths?: number | null): number {
  const months = intervalToMonths(interval, customMonths)
  return Math.round(amountCents / months)
}

export interface RecurringCostLike {
  amount_cents: number
  interval: RecurrenceInterval
  custom_interval_months?: number | null
}

/** Sum of monthly reserves across all recurring costs, in integer cents. */
export function totalMonthlyReserveCents(costs: RecurringCostLike[]): number {
  return costs.reduce((sum, c) => sum + monthlyReserveCents(c.amount_cents, c.interval, c.custom_interval_months), 0)
}

/** Sum of annualized cost across all recurring costs, in integer cents. */
export function totalAnnualCents(costs: RecurringCostLike[]): number {
  return costs.reduce((sum, c) => {
    const months = intervalToMonths(c.interval, c.custom_interval_months)
    return sum + Math.round((c.amount_cents / months) * 12)
  }, 0)
}

export type BudgetStatus = 'green' | 'yellow' | 'red'

/** Finanz-Ampel: green under 80%, yellow 80-100%, red over budget. */
export function budgetStatus(spentCents: number, plannedCents: number): BudgetStatus {
  if (plannedCents <= 0) return spentCents > 0 ? 'red' : 'green'
  const ratio = spentCents / plannedCents
  if (ratio > 1) return 'red'
  if (ratio >= 0.8) return 'yellow'
  return 'green'
}

export function savingsRate(incomeCents: number, expensesCents: number): number {
  if (incomeCents <= 0) return 0
  return Math.max(0, (incomeCents - expensesCents) / incomeCents)
}
