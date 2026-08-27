import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { parseCurrencyToCents } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

export interface QuickMoneyFormValues {
  amountCents: number
  categoryId?: string
  date: string
  paidBy: string
  isPrivate: boolean
  note: string
}

export function QuickMoneyForm({
  label,
  categories,
  members,
  showCategory = true,
  onSubmit,
}: {
  label: string
  categories?: Tables<'expense_categories'>[]
  members: Tables<'family_members'>[]
  showCategory?: boolean
  onSubmit: (values: QuickMoneyFormValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories?.[0]?.id ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paidBy, setPaidBy] = useState(members[0]?.user_id ?? '')
  const [isPrivate, setIsPrivate] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" /> {label}
      </Button>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const amountCents = parseCurrencyToCents(amount)
    if (!amountCents || amountCents <= 0) {
      setError('Bitte gib einen gültigen Betrag ein.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ amountCents, categoryId: showCategory ? categoryId : undefined, date, paidBy, isPrivate, note })
      setAmount('')
      setNote('')
      setOpen(false)
    } catch {
      setError('Konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Betrag (€)">
          <Input
            inputMode="decimal"
            placeholder="48,70"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Datum">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {showCategory && categories && (
        <Field label="Kategorie">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Bezahlt von">
          <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name ?? 'Mitglied'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sichtbarkeit">
          <Select value={isPrivate ? 'private' : 'shared'} onChange={(e) => setIsPrivate(e.target.value === 'private')}>
            <option value="shared">Gemeinsam</option>
            <option value="private">Privat</option>
          </Select>
        </Field>
      </div>

      <Field label="Notiz (optional)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Supermarkt" />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}
