import { supabase } from '@/lib/supabase'
import type { Inserts } from '@/types/database.types'

export const goalsService = {
  async getGoals(familyId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*, goal_transactions(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async createGoal(input: Inserts<'goals'>) {
    const { data, error } = await supabase.from('goals').insert(input).select('*, goal_transactions(*)').single()
    if (error) throw error
    return data
  },

  async addTransaction(input: Inserts<'goal_transactions'>) {
    const { data, error } = await supabase.from('goal_transactions').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  },
}
