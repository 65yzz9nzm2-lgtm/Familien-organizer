import { describe, expect, it } from 'vitest'
import { isSameDay, isSameMonth, monthGridDays, startOfWeek } from './calendar-grid'

describe('startOfWeek', () => {
  it('returns the Monday of the given week', () => {
    expect(startOfWeek(new Date(2026, 8, 3))).toEqual(new Date(2026, 7, 31)) // Thu Sep 3 2026 -> Mon Aug 31
  })

  it('is a no-op for a date that is already a Monday', () => {
    expect(startOfWeek(new Date(2026, 7, 31))).toEqual(new Date(2026, 7, 31))
  })
})

describe('monthGridDays', () => {
  it('returns 42 days (6 Monday-start weeks)', () => {
    expect(monthGridDays(new Date(2026, 8, 15))).toHaveLength(42)
  })

  it('starts on the Monday on/before the 1st of the month', () => {
    // Sep 2026: the 1st is a Tuesday, so the grid starts Mon Aug 31.
    const days = monthGridDays(new Date(2026, 8, 15))
    expect(days[0]).toEqual(new Date(2026, 7, 31))
  })

  it('includes every day of the target month', () => {
    const days = monthGridDays(new Date(2026, 8, 1))
    const septDays = days.filter((d) => isSameMonth(d, new Date(2026, 8, 1)))
    expect(septDays).toHaveLength(30)
  })
})

describe('isSameMonth / isSameDay', () => {
  it('isSameMonth ignores the day', () => {
    expect(isSameMonth(new Date(2026, 8, 1), new Date(2026, 8, 30))).toBe(true)
    expect(isSameMonth(new Date(2026, 8, 30), new Date(2026, 9, 1))).toBe(false)
  })

  it('isSameDay requires the same year, month, and day', () => {
    expect(isSameDay(new Date(2026, 8, 15), new Date(2026, 8, 15))).toBe(true)
    expect(isSameDay(new Date(2026, 8, 15), new Date(2027, 8, 15))).toBe(false)
  })
})
