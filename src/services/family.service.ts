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
    // Ordered by oldest first: if a user ever ends up in more than one family
    // (e.g. a retried/duplicate family creation), this deterministically
    // picks their original one instead of an arbitrary row.
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
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

  async createFamily(input: CreateFamilyInput) {
    // Creating the family and the creator's admin membership row has to
    // happen atomically in one SECURITY DEFINER function: Postgres enforces
    // the SELECT policy on rows returned by INSERT ... RETURNING, and at the
    // moment the family is inserted the creator isn't a member of it yet, so
    // two separate client-side inserts would fail RLS on the very first one.
    const { data, error } = await supabase.rpc('create_family_with_admin', {
      p_name: input.name,
      p_color: input.color ?? '#6366f1',
      p_country: input.country ?? 'DE',
      p_currency: input.currency ?? 'EUR',
      p_image_url: input.imageUrl,
    })
    if (error) throw error
    return data
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

  async updateMemberDisplayName(memberId: string, displayName: string) {
    const { error } = await supabase.from('family_members').update({ display_name: displayName }).eq('id', memberId)
    if (error) throw error
  },

  async removeMember(memberId: string) {
    const { error } = await supabase.from('family_members').delete().eq('id', memberId)
    if (error) throw error
  },
}
