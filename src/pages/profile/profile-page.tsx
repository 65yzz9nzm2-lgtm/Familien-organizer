import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useFamily } from '@/contexts/family-context'
import { settingsService } from '@/services/settings.service'

const ROLE_LABELS = { admin: 'Admin', parent: 'Elternteil', member: 'Mitglied', child: 'Kind' } as const

export default function ProfilePage() {
  const { user } = useAuth()
  const { family, membership, refresh } = useFamily()
  const [fullName, setFullName] = useState((user?.user_metadata?.full_name as string | undefined) ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!user) return null

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await settingsService.updateProfile(user!.id, { full_name: fullName })
      await refresh()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={fullName || user.email || ''} color={membership?.color} src={membership?.avatar_url} className="h-16 w-16 text-lg" />
            <div>
              <p className="text-sm font-medium">{user.email}</p>
              {membership && <Badge variant="secondary">{ROLE_LABELS[membership.role]}</Badge>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Familie</Label>
            <p className="text-sm text-muted-foreground">{family?.name ?? '—'}</p>
          </div>

          {saved && <p className="text-sm text-success">Gespeichert.</p>}

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
