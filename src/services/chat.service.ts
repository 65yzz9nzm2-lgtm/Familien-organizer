import { supabase } from '@/lib/supabase'
import type { Inserts } from '@/types/database.types'

export const chatService = {
  async getMessages(familyId: string, limit = 100) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, author:profiles(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).reverse()
  },

  async sendMessage(input: Inserts<'chat_messages'>) {
    const { data, error } = await supabase.from('chat_messages').insert(input).select('*, author:profiles(*)').single()
    if (error) throw error
    return data
  },

  subscribeToMessages(familyId: string, onInsert: () => void) {
    const channel = supabase
      .channel(`chat:${familyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${familyId}` }, onInsert)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}
