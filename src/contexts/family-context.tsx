import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { familyService } from '@/services/family.service'
import type { Tables } from '@/types/database.types'

interface FamilyContextValue {
  membership: Tables<'family_members'> | null
  family: Tables<'families'> | null
  members: Tables<'family_members'>[]
  loading: boolean
  role: Tables<'family_members'>['role'] | null
  isManager: boolean
  refresh: () => Promise<void>
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, supabaseConfigured } = useAuth()
  const [membership, setMembership] = useState<Tables<'family_members'> | null>(null)
  const [family, setFamily] = useState<Tables<'families'> | null>(null)
  const [members, setMembers] = useState<Tables<'family_members'>[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setMembership(null)
      setFamily(null)
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const myMembership = await familyService.getMyMembership(user.id)
      setMembership(myMembership)
      if (myMembership) {
        const [fam, mem] = await Promise.all([
          familyService.getFamily(myMembership.family_id),
          familyService.getMembers(myMembership.family_id),
        ])
        setFamily(fam)
        setMembers(mem)
      } else {
        setFamily(null)
        setMembers([])
      }
    } finally {
      setLoading(false)
    }
  }, [user, supabaseConfigured])

  useEffect(() => {
    refresh()
  }, [refresh])

  const role = membership?.role ?? null

  return (
    <FamilyContext.Provider
      value={{
        membership,
        family,
        members,
        loading,
        role,
        isManager: role === 'admin' || role === 'parent',
        refresh,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamily() {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider')
  return ctx
}
