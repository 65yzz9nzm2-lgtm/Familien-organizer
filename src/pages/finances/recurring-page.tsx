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

type RecurringRow = Tables<'recurring_expenses'> & { category: Tables<'expense_categories'> | null }

export default function RecurringPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [items, setItems] = useState<RecurringRow[]>([])
  const [categories, setCategories] = useState<Tables<'expense_categories'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringRow | null>(null)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [rec, cats] = await Promise.all([
        financeService.getRecurringExpenses(family.id),
        financeService.getCategories(family.id, 'expense'),
      ])
      setItems(rec as RecurringRow[])
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  function openForm(item: RecurringRow | null) {
    setEditing(item)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await financeService.deleteRecurringExpense(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  if (!family) return null

  const totalMonthly = totalMonthlyReserveCents(items)
  const totalAnnual = items.filter((i) => i.interval === 'annual').reduce((s, i) => s + i.amount_cents, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-primary/5">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Empfohlene monatliche Rücklage</p>
            <p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Jahreskosten gesamt (jährlich fällig)</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAnnual)}</p>
          </CardContent>
        </Card>
      </div>

      {formOpen ? (
        <RecurringForm
          categories={categories}
          initial={editing}
          onClose={closeForm}
          onSubmit={async (values) => {
            if (!user) return
            if (editing) {
              await financeService.updateRecurringExpense(editing.id, {
                category_id: values.categoryId,
                name: values.name,
                amount_cents: values.amountCents,
                interval: values.interval,
                custom_interval_months: values.interval === 'custom' ? values.customMonths : null,
                next_due_date: values.nextDueDate,
              })
            } else {
              await financeService.addRecurringExpense({
                family_id: family.id,
                category_id: values.categoryId,
                name: values.name,
                amount_cents: values.amountCents,
                interval: values.interval,
                custom_interval_months: values.interval === 'custom' ? values.customMonths : null,
                next_due_date: values.nextDueDate,
                created_by: user.id,
              })
            }
            closeForm()
            await load()
          }}
        />
      ) : (
        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4" /> Fixkosten
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState emoji="🧾" title="Noch keine Fixkosten hinterlegt" description="Miete, Versicherungen, Abos & Co." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.amount_cents)} · {INTERVAL_LABELS[item.interval]} · nächste Fälligkeit{' '}
                    {formatDate(item.next_due_date)}
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

function RecurringForm({
  categories,
  initial,
  onSubmit,
  onClose,
}: {
  categories: Tables<'expense_categories'>[]
  initial: RecurringRow | null
  onSubmit: (values: {
    name: string
    amountCents: number
    categoryId: string
    interval: RecurrenceInterval
    customMonths: number | null
    nextDueDate: string
  }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? (initial.amount_cents / 100).toFixed(2).replace('.', ',') : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '')
  const [interval, setInterval] = useState<RecurrenceInterval>(initial?.interval ?? 'annual')
  const [customMonths, setCustomMonths] = useState(String(initial?.custom_interval_months ?? 12))
  const [nextDueDate, setNextDueDate] = useState(initial?.next_due_date ?? new Date().toISOString().slice(0, 10))
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
        categoryId,
        interval,
        customMonths: interval === 'custom' ? Number(customMonths) : null,
        nextDueDate,
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
        <p className="text-sm font-semibold">{initial ? 'Fixkosten bearbeiten' : 'Fixkosten hinzufügen'}</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Autoversicherung" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Betrag (€)</Label>
          <Input inputMode="decimal" placeholder="780,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kategorie</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
            <Label className="text-xs">Nächste Fälligkeit</Label>
            <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>
        )}
      </div>
      {interval === 'custom' && (
        <div className="space-y-1">
          <Label className="text-xs">Nächste Fälligkeit</Label>
          <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
