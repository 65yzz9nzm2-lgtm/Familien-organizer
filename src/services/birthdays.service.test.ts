import { describe, expect, it } from 'vitest'
import { daysUntilNextBirthday, nextAge } from './birthdays.service'

describe('daysUntilNextBirthday', () => {
  it('is 0 when the birthday is today', () => {
    const today = new Date('2026-04-12T10:00:00Z')
    expect(daysUntilNextBirthday('2015-04-12', today)).toBe(0)
  })

  it('counts forward within the same year', () => {
    const today = new Date('2026-01-01T00:00:00Z')
    expect(daysUntilNextBirthday('2015-01-08', today)).toBe(7)
  })

  it('wraps to next year once the birthday has passed', () => {
    const today = new Date('2026-04-13T00:00:00Z')
    // 2026-04-12 already passed -> next occurrence is 2027-04-12.
    expect(daysUntilNextBirthday('2015-04-12', today)).toBe(364)
  })
})

describe('nextAge', () => {
  it('computes the age turned on the next occurrence of the birthday', () => {
    const today = new Date('2026-04-01T00:00:00Z')
    expect(nextAge('2015-04-12', today)).toBe(11)
  })

  it('rolls over to the following year after the birthday has passed', () => {
    const today = new Date('2026-04-13T00:00:00Z')
    expect(nextAge('2015-04-12', today)).toBe(12)
  })
})
