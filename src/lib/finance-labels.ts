import type { RecurrenceInterval } from '@/types/database.types'

export const INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  monthly: 'monatlich',
  bimonthly: 'zweimonatlich',
  quarterly: 'vierteljährlich',
  semiannual: 'halbjährlich',
  annual: 'jährlich',
  custom: 'individuell',
}
