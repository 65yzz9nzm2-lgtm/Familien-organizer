import { supabase } from '@/lib/supabase'
import type { Inserts, Tables } from '@/types/database.types'

export const tasksService = {
  async getTasks(familyId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignments(*)')
      .eq('family_id', familyId)
      .order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  async createTask(input: Inserts<'tasks'>, assigneeIds: string[] = []) {
    const { data: task, error } = await supabase.from('tasks').insert(input).select().single()
    if (error) throw error

    if (assigneeIds.length > 0) {
      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assigneeIds.map((user_id) => ({ task_id: task.id, user_id })))
      if (assignError) throw assignError
    }
    return task
  },

  async completeTask(task: Tables<'tasks'>) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id)
    if (error) throw error

    if (task.points > 0) {
      const { data: assignments } = await supabase.from('task_assignments').select('user_id').eq('task_id', task.id)
      const assignees = assignments && assignments.length > 0 ? assignments.map((a) => a.user_id) : []
      if (assignees.length > 0) {
        const { error: pointsError } = await supabase.from('reward_points').insert(
          assignees.map((user_id) => ({
            family_id: task.family_id,
            user_id,
            points: task.points,
            reason: `Aufgabe erledigt: ${task.title}`,
            task_id: task.id,
          })),
        )
        if (pointsError) throw pointsError
      }
    }
  },

  async reopenTask(id: string) {
    const { error } = await supabase.from('tasks').update({ status: 'open', completed_at: null }).eq('id', id)
    if (error) throw error
  },

  async deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  },

  async getRewards(familyId: string) {
    const { data, error } = await supabase.from('rewards').select('*').eq('family_id', familyId).order('points_cost')
    if (error) throw error
    return data ?? []
  },

  async createReward(input: Inserts<'rewards'>) {
    const { data, error } = await supabase.from('rewards').insert(input).select().single()
    if (error) throw error
    return data
  },

  async redeemReward(reward: Tables<'rewards'>, userId: string) {
    const { error } = await supabase.from('reward_points').insert({
      family_id: reward.family_id,
      user_id: userId,
      points: -reward.points_cost,
      reason: `Belohnung eingelöst: ${reward.title}`,
      reward_id: reward.id,
    })
    if (error) throw error
  },

  async getPointsBalances(familyId: string) {
    const { data, error } = await supabase.from('reward_points').select('user_id, points').eq('family_id', familyId)
    if (error) throw error
    const balances = new Map<string, number>()
    for (const row of data ?? []) {
      balances.set(row.user_id, (balances.get(row.user_id) ?? 0) + row.points)
    }
    return balances
  },
}
