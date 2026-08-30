import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { monthlyReserveCents, totalMonthlyReserveCents } from '@/lib/finance-calculations'
import { INTERVAL_LABELS } from '@/lib/finance-labels'
import type { RecurrenceInterval, Tables } from '@/types/database.types'

type SourceType = Tables<'recurring_income'>['source_type']

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  salary: 'Gehalt',
  child_benefit: 'Kindergeld',
  bonus: 'Bonus',
  side_job: 'Nebenjob',
  refund: 'Erstattung',
  other: 'Sonstiges',
}

export default function RecurringIncomePage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [items, setItems] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'recurring_income'> | null>(null)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const data = await financeService.getRecurringIncome(family.id)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  function openForm(item: Tables<'recurring_income'> | null) {
    setEditing(item)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await financeService.deleteRecurringIncome(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  if (!family) return null

  const totalMonthly = totalMonthlyReserveCents(items)

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Monatliche fixe Einnahmen</p>
          <p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
        </CardContent>
      </Card>

      {formOpen ? (
        <RecurringIncomeForm
          initial={editing}
          onClose={closeForm}
          onSubmit={async (values) => {
            if (!user) return
            if (editing) {
              await financeService.updateRecurringIncome(editing.id, {
                source_type: values.sourceType,
                name: values.name,
                amount_cents: values.amountCents,
                interval: values.interval,
                custom_interval_months: values.interval === 'custom' ? values.customMonths : null,
                next_due_date: values.nextDueDate,
                is_private: values.isPrivate,
              })
            } else {
              await financeService.addRecurringIncome({
                family_id: family.id,
                source_type: values.sourceType,
                name: values.name,
                amount_cents: values.amountCents,
                interval: values.interval,
                custom_interval_months: values.interval === 'custom' ? values.customMonths : null,
                next_due_date: values.nextDueDate,
                is_private: values.isPrivate,
                owner_id: user.id,
                created_by: user.id,
              })
            }
            closeForm()
            await load()
          }}
        />
      ) : (
        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4" /> Fixe Einnahme
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          emoji="💰"
          title="Noch keine fixen Einnahmen hinterlegt"
          description="Gehalt, Kindergeld & Co. — so musst du sie nicht jeden Monat neu eintragen."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {item.name}
                    {item.is_private && <span className="ml-2 text-[11px] text-muted-foreground">(privat)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SOURCE_TYPE_LABELS[item.source_type]} · {formatCurrency(item.amount_cents)} ·{' '}
                    {INTERVAL_LABELS[item.interval]} · nächste Zahlung {formatDate(item.next_due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(monthlyReserveCents(item.amount_cents, item.interval, item.custom_interval_months))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">pro Monat</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openForm(item)} aria-label="Bearbeiten">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Löschen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RecurringIncomeForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial: Tables<'recurring_income'> | null
  onSubmit: (values: {
    name: string
    amountCents: number
    sourceType: SourceType
    interval: RecurrenceInterval
    customMonths: number | null
    nextDueDate: string
    isPrivate: boolean
  }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? (initial.amount_cents / 100).toFixed(2).replace('.', ',') : '')
  const [sourceType, setSourceType] = useState<SourceType>(initial?.source_type ?? 'salary')
  const [interval, setInterval] = useState<RecurrenceInterval>(initial?.interval ?? 'monthly')
  const [customMonths, setCustomMonths] = useState(String(initial?.custom_interval_months ?? 12))
  const [nextDueDate, setNextDueDate] = useState(initial?.next_due_date ?? new Date().toISOString().slice(0, 10))
  const [isPrivate, setIsPrivate] = useState(initial?.is_private ?? false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amountCents = parseCurrencyToCents(amount)
    if (!name.trim()) return setError('Bitte gib einen Namen ein.')
    if (!amountCents || amountCents <= 0) return setError('Bitte gib einen gültigen Betrag ein.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        amountCents,
        sourceType,
        interval,
        customMonths: interval === 'custom' ? Number(customMonths) : null,
        nextDueDate,
        isPrivate,
      })
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{initial ? 'Fixe Einnahme bearbeiten' : 'Fixe Einnahme hinzufügen'}</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gehalt" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Betrag (€)</Label>
          <Input inputMode="decimal" placeholder="2.400,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Art</Label>
          <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
            {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Intervall</Label>
          <Select value={interval} onChange={(e) => setInterval(e.target.value as RecurrenceInterval)}>
            {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {interval === 'custom' ? (
          <div className="space-y-1">
            <Label className="text-xs">Alle wie viele Monate?</Label>
            <Input type="number" min={1} value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Nächste Zahlung</Label>
            <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>
        )}
      </div>
      {interval === 'custom' && (
        <div className="space-y-1">
          <Label className="text-xs">Nächste Zahlung</Label>
          <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4" />
        Nur für mich sichtbar (privat)
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
