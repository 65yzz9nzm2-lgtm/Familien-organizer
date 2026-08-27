import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export interface CreateFamilyInput {
  name: string
  color?: string
  country?: string
  currency?: string
  imageUrl?: string
}

export const familyService = {
  async getMyMembership(userId: string): Promise<Tables<'family_members'> | null> {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getFamily(familyId: string): Promise<Tables<'families'> | null> {
    const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
    if (error) throw error
    return data
  },

  async getMembers(familyId: string): Promise<Tables<'family_members'>[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async createFamily(userId: string, input: CreateFamilyInput) {
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: input.name,
        color: input.color ?? '#6366f1',
        country: input.country ?? 'DE',
        currency: input.currency ?? 'EUR',
        image_url: input.imageUrl,
        created_by: userId,
      })
      .select()
      .single()
    if (familyError) throw familyError

    const { error: memberError } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: userId, role: 'admin' })
    if (memberError) throw memberError

    return family
  },

  async joinByCode(code: string): Promise<string> {
    const { data, error } = await supabase.rpc('accept_family_invitation', { invite_code: code.trim().toUpperCase() })
    if (error) throw error
    return data as string
  },

  async createInvitation(familyId: string, createdBy: string, role: Tables<'family_members'>['role'], email?: string) {
    const { data, error } = await supabase
      .from('family_invitations')
      .insert({ family_id: familyId, created_by: createdBy, invited_role: role, email })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getActiveInvitations(familyId: string) {
    const { data, error } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('family_id', familyId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async updateMemberRole(memberId: string, role: Tables<'family_members'>['role']) {
    const { error } = await supabase.from('family_members').update({ role }).eq('id', memberId)
    if (error) throw error
  },

  async removeMember(memberId: string) {
    const { error } = await supabase.from('family_members').delete().eq('id', memberId)
    if (error) throw error
  },
}
