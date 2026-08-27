import { supabase } from '@/lib/supabase'
import type { Inserts, Tables } from '@/types/database.types'

export const calendarService = {
  async getEvents(familyId: string, rangeStart: Date, rangeEnd: Date) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('family_id', familyId)
      .gte('start_at', rangeStart.toISOString())
      .lt('start_at', rangeEnd.toISOString())
      .order('start_at')
    if (error) throw error
    return data ?? []
  },

  async getUpcoming(familyId: string, limit = 5) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('family_id', familyId)
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async createEvent(input: Inserts<'calendar_events'>) {
    const { data, error } = await supabase.from('calendar_events').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteEvent(id: string) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) throw error
  },
}

export type CalendarEvent = Tables<'calendar_events'>
