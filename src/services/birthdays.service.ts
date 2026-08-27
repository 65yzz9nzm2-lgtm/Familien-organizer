import { supabase } from '@/lib/supabase'
import type { Inserts } from '@/types/database.types'

export const birthdaysService = {
  async getBirthdays(familyId: string) {
    const { data, error } = await supabase.from('birthdays').select('*').eq('family_id', familyId).order('date_of_birth')
    if (error) throw error
    return data ?? []
  },

  async createBirthday(input: Inserts<'birthdays'>) {
    const { data, error } = await supabase.from('birthdays').insert(input).select().single()
    if (error) throw error
    return data
  },

  async toggleGiftPurchased(id: string, purchased: boolean) {
    const { error } = await supabase.from('birthdays').update({ gift_purchased: purchased }).eq('id', id)
    if (error) throw error
  },

  async deleteBirthday(id: string) {
    const { error } = await supabase.from('birthdays').delete().eq('id', id)
    if (error) throw error
  },
}

/** Days until the next occurrence of this date-of-birth (0 = today). */
export function daysUntilNextBirthday(dateOfBirth: string, today = new Date()): number {
  const dob = new Date(dateOfBirth)
  const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  next.setHours(0, 0, 0, 0)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (next < todayMidnight) next.setFullYear(next.getFullYear() + 1)
  return Math.round((next.getTime() - todayMidnight.getTime()) / 86_400_000)
}

export function nextAge(dateOfBirth: string, today = new Date()): number {
  const dob = new Date(dateOfBirth)
  const daysUntil = daysUntilNextBirthday(dateOfBirth, today)
  const nextBirthdayYear = new Date(today.getTime() + daysUntil * 86_400_000).getFullYear()
  return nextBirthdayYear - dob.getFullYear()
}
