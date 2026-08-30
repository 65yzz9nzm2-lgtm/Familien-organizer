import { useEffect, useState } from 'react'
import { Copy, Loader2, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useFamily } from '@/contexts/family-context'
import { familyService } from '@/services/family.service'
import type { Tables } from '@/types/database.types'

const ROLE_LABELS: Record<Tables<'family_members'>['role'], string> = {
  admin: 'Admin',
  parent: 'Elternteil',
  member: 'Mitglied',
  child: 'Kind',
}

const INVITE_ROLE_OPTIONS: Tables<'family_members'>['role'][] = ['parent', 'member', 'child']

export default function FamilyPage() {
  const { user } = useAuth()
  const { family, members, isManager, refresh } = useFamily()
  const [invitations, setInvitations] = useState<Tables<'family_invitations'>[]>([])
  const [inviteRole, setInviteRole] = useState<Tables<'family_members'>['role']>('member')
  const [creatingInvite, setCreatingInvite] = useState(false)

  useEffect(() => {
    if (family && isManager) {
      familyService.getActiveInvitations(family.id).then(setInvitations).catch(() => {})
    }
  }, [family, isManager])

  if (!family) return null

  async function handleInvite() {
    if (!family || !user) return
    setCreatingInvite(true)
    try {
      const invite = await familyService.createInvitation(family.id, user.id, inviteRole)
      setInvitations((prev) => [invite, ...prev])
    } finally {
      setCreatingInvite(false)
    }
  }

  async function handleRoleChange(memberId: string, role: Tables<'family_members'>['role']) {
    await familyService.updateMemberRole(memberId, role)
    await refresh()
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Dieses Mitglied wirklich aus der Familie entfernen?')) return
    await familyService.removeMember(memberId)
    await refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{family.name}</h1>
        <p className="text-sm text-muted-foreground">Familienmitglieder, Rollen und Einladungen verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mitglieder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.display_name ?? 'Mitglied'} color={m.color} src={m.avatar_url} />
                <div>
                  <p className="text-sm font-medium">{m.display_name ?? 'Mitglied'}</p>
                  <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                </div>
              </div>
              {isManager && m.user_id !== user?.id && (
                <div className="flex items-center gap-2">
                  <Select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value as Tables<'family_members'>['role'])}
                    className="h-9 w-32"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)} aria-label="Mitglied entfernen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {isManager && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Einladungen</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Tables<'family_members'>['role'])}
                className="h-9 w-32"
                aria-label="Rolle für neue Einladung"
              >
                {INVITE_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={handleInvite} disabled={creatingInvite}>
                {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Einladungscode erstellen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.length === 0 && <p className="text-sm text-muted-foreground">Keine aktiven Einladungen.</p>}
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-mono text-sm font-semibold tracking-widest">{inv.code}</p>
                  <p className="text-xs text-muted-foreground">
                    Für {ROLE_LABELS[inv.invited_role]} · Gültig bis {new Date(inv.expires_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inv.code)}>
                  <Copy className="h-3.5 w-3.5" /> Kopieren
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
