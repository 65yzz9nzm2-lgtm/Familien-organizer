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

/** Parses a "YYYY-MM-DD" date column value as a local midnight Date, avoiding the UTC-parsing day shift of `new Date(str)`. */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Rolls a recurring item's stored `next_due_date` forward by whole intervals until it lands on
 * or after `today`, without needing to write anything back to the database - the stored date
 * stays a fixed anchor, and every occurrence is computed live from it. A due date that's still
 * in the future is returned unchanged.
 */
export function nextOccurrenceOnOrAfter(
  anchorDate: string,
  interval: RecurrenceInterval,
  customMonths: number | null | undefined,
  today: Date = new Date(),
): string {
  const months = intervalToMonths(interval, customMonths)
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let occurrence = parseDateOnly(anchorDate)
  while (occurrence < ref) {
    occurrence = new Date(occurrence.getFullYear(), occurrence.getMonth() + months, occurrence.getDate())
  }
  return formatDateOnly(occurrence)
}

/**
 * Every occurrence date ("YYYY-MM-DD") of a recurring item that falls within [rangeStart, rangeEnd),
 * computed live from the stored anchor date by stepping whole intervals in either direction - used
 * for calendar month/year views, which need every occurrence in view, not just the next one.
 */
export function occurrencesInRange(
  anchorDate: string,
  interval: RecurrenceInterval,
  customMonths: number | null | undefined,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const months = intervalToMonths(interval, customMonths)
  const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate())
  const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate())

  let occurrence = parseDateOnly(anchorDate)
  while (occurrence >= start) {
    occurrence = new Date(occurrence.getFullYear(), occurrence.getMonth() - months, occurrence.getDate())
  }

  const results: string[] = []
  occurrence = new Date(occurrence.getFullYear(), occurrence.getMonth() + months, occurrence.getDate())
  while (occurrence < end) {
    if (occurrence >= start) results.push(formatDateOnly(occurrence))
    occurrence = new Date(occurrence.getFullYear(), occurrence.getMonth() + months, occurrence.getDate())
  }
  return results
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

export interface MonthlyTotals {
  /** "YYYY-MM" */
  monthKey: string
  incomeCents: number
  expenseCents: number
}

/** Groups expenses and income by calendar month (from their occurred_on date) for a statistics chart. */
export function aggregateByMonth(
  expenses: { occurred_on: string; amount_cents: number }[],
  income: { occurred_on: string; amount_cents: number }[],
): MonthlyTotals[] {
  const byMonth = new Map<string, MonthlyTotals>()

  function bucket(occurredOn: string): MonthlyTotals {
    const monthKey = occurredOn.slice(0, 7)
    let existing = byMonth.get(monthKey)
    if (!existing) {
      existing = { monthKey, incomeCents: 0, expenseCents: 0 }
      byMonth.set(monthKey, existing)
    }
    return existing
  }

  for (const e of expenses) bucket(e.occurred_on).expenseCents += e.amount_cents
  for (const i of income) bucket(i.occurred_on).incomeCents += i.amount_cents

  return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

/** Every "YYYY-MM" calendar month touched by [start, end), e.g. for prorating recurring costs over a statistics period. */
export function monthKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor < end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return keys
}

/**
 * Monthly totals for every month in `monthKeys` (zero-filled if a month has no logged transactions),
 * with a constant recurring reserve (Fixkosten / fixe Einnahmen) added to each month - since those are
 * ongoing obligations that aren't necessarily re-entered as a transaction every month.
 */
export function buildMonthlyTotalsWithRecurring(
  monthKeys: string[],
  expenses: { occurred_on: string; amount_cents: number }[],
  income: { occurred_on: string; amount_cents: number }[],
  recurringExpenseCentsPerMonth: number,
  recurringIncomeCentsPerMonth: number,
): MonthlyTotals[] {
  const byMonth = new Map(aggregateByMonth(expenses, income).map((m) => [m.monthKey, m]))
  return monthKeys.map((monthKey) => ({
    monthKey,
    incomeCents: (byMonth.get(monthKey)?.incomeCents ?? 0) + recurringIncomeCentsPerMonth,
    expenseCents: (byMonth.get(monthKey)?.expenseCents ?? 0) + recurringExpenseCentsPerMonth,
  }))
}
