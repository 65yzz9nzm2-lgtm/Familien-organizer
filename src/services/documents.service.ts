import { supabase } from '@/lib/supabase'
import { compressImageIfNeeded } from '@/lib/image-compression'
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
    // Photos of documents (the common case on mobile) are downscaled and
    // re-encoded before upload, since Supabase's free storage quota is 1 GB
    // and an uncompressed phone photo can be 3-5 MB. PDFs and already-small
    // images pass through unchanged.
    const uploadable = await compressImageIfNeeded(file)
    const path = `${familyId}/${crypto.randomUUID()}-${uploadable.name}`
    const { error } = await supabase.storage.from('documents').upload(path, uploadable)
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
