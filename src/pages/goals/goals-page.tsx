import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { goalsService } from '@/services/goals.service'
import { formatCurrency, formatDate, parseCurrencyToCents } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type GoalRow = Tables<'goals'> & { goal_transactions: Tables<'goal_transactions'>[] }

export default function GoalsPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      setGoals((await goalsService.getGoals(family.id)) as GoalRow[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  async function handleAddFunds(goal: GoalRow) {
    const input = prompt(`Wie viel möchtet ihr zu "${goal.title}" hinzufügen? (in €)`)
    if (!input) return
    const cents = parseCurrencyToCents(input)
    if (!cents || !user) return
    await goalsService.addTransaction({ goal_id: goal.id, amount_cents: cents, created_by: user.id })
    await load()
  }

  async function handleDelete(id: string) {
    await goalsService.deleteGoal(id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  if (!family || !user) return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Familienziele</h1>
        <p className="text-sm text-muted-foreground">Gemeinsam sparen für das, was euch wichtig ist</p>
      </div>

      {formOpen ? (
        <GoalForm
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await goalsService.createGoal({
              family_id: family.id,
              title: values.title,
              target_amount_cents: values.targetCents,
              target_date: values.targetDate || null,
              created_by: user.id,
            })
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Ziel
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState emoji="🏝️" title="Noch keine Sparziele" description="Legt euer erstes gemeinsames Ziel an, z. B. Urlaub 2027." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const saved = goal.goal_transactions.reduce((s, t) => s + t.amount_cents, 0)
            const progress = (saved / goal.target_amount_cents) * 100
            const monthsLeft = goal.target_date
              ? Math.max(1, Math.round((new Date(goal.target_date).getTime() - Date.now()) / (30 * 86_400_000)))
              : null
            const monthlyNeeded = monthsLeft ? Math.max(0, Math.round((goal.target_amount_cents - saved) / monthsLeft)) : null

            return (
              <Card key={goal.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{goal.title}</p>
                      {goal.target_date && <p className="text-xs text-muted-foreground">Ziel: {formatDate(goal.target_date)}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)} aria-label="Löschen">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Progress value={progress} />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{formatCurrency(saved)}</span>
                    <span className="text-muted-foreground">von {formatCurrency(goal.target_amount_cents)}</span>
                  </div>
                  {monthlyNeeded !== null && monthlyNeeded > 0 && (
                    <p className="text-xs text-muted-foreground">Benötigt ca. {formatCurrency(monthlyNeeded)}/Monat</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleAddFunds(goal)}>
                    <Plus className="h-3.5 w-3.5" /> Betrag hinzufügen
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GoalForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (values: { title: string; targetCents: number; targetDate: string }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cents = parseCurrencyToCents(target)
    if (!title.trim()) return setError('Bitte gib einen Titel ein.')
    if (!cents || cents <= 0) return setError('Bitte gib einen gültigen Betrag ein.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ title: title.trim(), targetCents: cents, targetDate })
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Neues Ziel</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Titel</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Urlaub 2027" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Zielbetrag (€)</Label>
          <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="4.000,00" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Zieldatum (optional)</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
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
