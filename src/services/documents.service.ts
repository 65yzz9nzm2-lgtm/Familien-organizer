import { supabase } from '@/lib/supabase'
import type { Inserts } from '@/types/database.types'

export const documentsService = {
  async getDocuments(familyId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async uploadFile(familyId: string, file: File) {
    const path = `${familyId}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (error) throw error
    return path
  },

  async createDocument(input: Inserts<'documents'>) {
    const { data, error } = await supabase.from('documents').insert(input).select().single()
    if (error) throw error
    return data
  },

  async getSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 5)
    if (error) throw error
    return data.signedUrl
  },

  async deleteDocument(id: string, storagePath: string) {
    await supabase.storage.from('documents').remove([storagePath])
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw error
  },
}
