import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { QuickMoneyForm, type QuickMoneyFormValues } from '@/components/finance/quick-money-form'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/services/finance.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type ExpenseRow = Tables<'expenses'> & { category: Tables<'expense_categories'> | null }

function startOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function ExpensesPage() {
  const { family, members } = useFamily()
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(startOfCurrentMonth)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [categories, setCategories] = useState<Tables<'expense_categories'>[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [exp, cats] = await Promise.all([
        financeService.getExpenses(family.id, selectedMonth),
        financeService.getCategories(family.id, 'expense'),
      ])
      setExpenses(exp as ExpenseRow[])
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, selectedMonth])

  async function handleAdd(values: QuickMoneyFormValues) {
    if (!family || !user) return
    await financeService.addExpense({
      family_id: family.id,
      category_id: values.categoryId,
      amount_cents: values.amountCents,
      occurred_on: values.date,
      paid_by: values.paidBy,
      is_private: values.isPrivate,
      owner_id: user.id,
      note: values.note || null,
    })
    await load()
  }

  async function handleDelete(id: string) {
    await financeService.deleteExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
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

      <QuickMoneyForm label="Ausgabe" categories={categories} members={members} onSubmit={handleAdd} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          emoji="💸"
          title="Noch keine Ausgaben erfasst"
          description={`Erfasse eure erste Ausgabe für ${monthLabel}.`}
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: `${e.category?.color ?? '#64748b'}22`, color: e.category?.color ?? '#64748b' }}
                  >
                    {e.category?.name?.slice(0, 2).toUpperCase() ?? '—'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.note || e.category?.name || 'Ausgabe'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.occurred_on)} · {e.category?.name} · {memberName(e.paid_by)}
                      {e.is_private && (
                        <Badge variant="secondary" className="ml-1.5">
                          Privat
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold">{formatCurrency(e.amount_cents)}</p>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} aria-label="Löschen">
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
