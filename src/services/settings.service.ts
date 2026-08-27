import { supabase } from '@/lib/supabase'
import type { Updates } from '@/types/database.types'

export const settingsService = {
  async getUserSettings(userId: string) {
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return data
  },

  async updateUserSettings(userId: string, updates: Updates<'user_settings'>) {
    const { error } = await supabase.from('user_settings').update(updates).eq('user_id', userId)
    if (error) throw error
  },

  async updateFamilySettings(familyId: string, updates: Updates<'family_settings'>) {
    const { error } = await supabase.from('family_settings').update(updates).eq('family_id', familyId)
    if (error) throw error
  },

  async updateProfile(userId: string, updates: Updates<'profiles'>) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) throw error
  },
}
