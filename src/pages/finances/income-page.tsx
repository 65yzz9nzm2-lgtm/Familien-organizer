import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/services/finance.service'
import { formatCurrency, formatDate, parseCurrencyToCents } from '@/lib/utils'
import { monthlyReserveCents } from '@/lib/finance-calculations'
import type { IncomeSourceType, Tables } from '@/types/database.types'

const SOURCE_LABELS: Record<IncomeSourceType, string> = {
  salary: 'Gehalt',
  child_benefit: 'Kindergeld',
  bonus: 'Bonus',
  side_job: 'Nebenjob',
  refund: 'Rückerstattung',
  other: 'Sonstige',
}

function startOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function IncomePage() {
  const { family, members } = useFamily()
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(startOfCurrentMonth)
  const [income, setIncome] = useState<Tables<'income'>[]>([])
  const [recurring, setRecurring] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [inc, rec] = await Promise.all([
        financeService.getIncome(family.id, selectedMonth),
        financeService.getRecurringIncome(family.id),
      ])
      setIncome(inc)
      setRecurring(rec)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, selectedMonth])

  async function handleDelete(id: string) {
    await financeService.deleteIncome(id)
    setIncome((prev) => prev.filter((i) => i.id !== id))
  }

  if (!family) return null

  const monthLabel = selectedMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth.getTime() === startOfCurrentMonth().getTime()

  function memberName(userId: string | null) {
    return members.find((m) => m.user_id === userId)?.display_name ?? 'Unbekannt'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium capitalize">{monthLabel}</p>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          disabled={isCurrentMonth}
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {formOpen ? (
        <IncomeForm
          members={members}
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            if (!user) return
            await financeService.addIncome({
              family_id: family.id,
              source_type: values.sourceType,
              amount_cents: values.amountCents,
              occurred_on: values.date,
              received_by: values.receivedBy,
              is_private: values.isPrivate,
              owner_id: user.id,
              note: values.note || null,
            })
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Einnahme
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : income.length === 0 ? (
        <EmptyState emoji="💰" title="Noch keine Einnahmen erfasst" description={`Erfasse Gehalt, Kindergeld & Co. für ${monthLabel}.`} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {income.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">{i.note || SOURCE_LABELS[i.source_type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(i.occurred_on)} · {SOURCE_LABELS[i.source_type]} · {memberName(i.received_by)}
                    {i.is_private && (
                      <Badge variant="secondary" className="ml-1.5">
                        Privat
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-success">+{formatCurrency(i.amount_cents)}</p>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)} aria-label="Löschen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && recurring.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Fixe Einnahmen (anteilig für {monthLabel})</p>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recurring.map((r) => (
                <Link
                  key={r.id}
                  to="/finanzen/fixe-einnahmen"
                  className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Repeat className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[r.source_type]}
                        <Badge variant="secondary" className="ml-1.5">
                          Fixe Einnahme
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-success">
                    +{formatCurrency(monthlyReserveCents(r.amount_cents, r.interval, r.custom_interval_months))}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function IncomeForm({
  members,
  onSubmit,
  onClose,
}: {
  members: Tables<'family_members'>[]
  onSubmit: (values: {
    amountCents: number
    sourceType: IncomeSourceType
    date: string
    receivedBy: string
    isPrivate: boolean
    note: string
  }) => Promise<void>
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [sourceType, setSourceType] = useState<IncomeSourceType>('salary')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receivedBy, setReceivedBy] = useState(members[0]?.user_id ?? '')
  const [isPrivate, setIsPrivate] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amountCents = parseCurrencyToCents(amount)
    if (!amountCents || amountCents <= 0) {
      setError('Bitte gib einen gültigen Betrag ein.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ amountCents, sourceType, date, receivedBy, isPrivate, note })
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Einnahme</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Betrag (€)</Label>
          <Input inputMode="decimal" placeholder="3.800,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Art</Label>
        <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as IncomeSourceType)}>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Erhalten von</Label>
          <Select value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name ?? 'Mitglied'}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sichtbarkeit</Label>
          <Select value={isPrivate ? 'private' : 'shared'} onChange={(e) => setIsPrivate(e.target.value === 'private')}>
            <option value="shared">Gemeinsam</option>
            <option value="private">Privat</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notiz (optional)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
