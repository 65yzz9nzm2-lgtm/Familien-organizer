/** Monday-start week index (0 = Monday .. 6 = Sunday) for a given Date. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - mondayIndex(d))
  return d
}

/** The 6x7 Monday-start day grid for the month containing `monthStart` (or any date in that month), including leading/trailing days from adjacent months. */
export function monthGridDays(monthDate: Date): Date[] {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function isSameDay(a: Date, b: Date): boolean {
  return isSameMonth(a, b) && a.getDate() === b.getDate()
}
