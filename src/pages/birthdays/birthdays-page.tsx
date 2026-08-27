import { useEffect, useState, type FormEvent } from 'react'
import { Cake, Gift, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { birthdaysService, daysUntilNextBirthday, nextAge } from '@/services/birthdays.service'
import { formatDate } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

export default function BirthdaysPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [birthdays, setBirthdays] = useState<Tables<'birthdays'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      setBirthdays(await birthdaysService.getBirthdays(family.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  if (!family || !user) return null

  const sorted = [...birthdays].sort((a, b) => daysUntilNextBirthday(a.date_of_birth) - daysUntilNextBirthday(b.date_of_birth))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Geburtstage</h1>

      {formOpen ? (
        <BirthdayForm
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await birthdaysService.createBirthday({ family_id: family.id, name: values.name, date_of_birth: values.dob, created_by: user.id })
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Geburtstag
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState emoji="🎂" title="Noch keine Geburtstage hinterlegt" description="Damit ihr nie einen Geburtstag verpasst." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {sorted.map((b) => {
              const days = daysUntilNextBirthday(b.date_of_birth)
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Cake className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(b.date_of_birth)} · wird {nextAge(b.date_of_birth)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={days <= 7 ? 'warning' : 'secondary'}>
                      {days === 0 ? 'Heute!' : `in ${days} Tagen`}
                    </Badge>
                    {b.gift_purchased && (
                      <Badge variant="success">
                        <Gift className="mr-1 h-3 w-3" /> Geschenk besorgt
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await birthdaysService.deleteBirthday(b.id)
                        setBirthdays((prev) => prev.filter((x) => x.id !== b.id))
                      }}
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BirthdayForm({ onSubmit, onClose }: { onSubmit: (v: { name: string; dob: string }) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dob) return setError('Bitte fülle Name und Geburtsdatum aus.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), dob })
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Geburtstag hinzufügen</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Geburtsdatum</Label>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
