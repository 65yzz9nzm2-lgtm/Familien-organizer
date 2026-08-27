import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { financeService } from '@/services/finance.service'
import { cn, formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { budgetStatus } from '@/lib/finance-calculations'
import type { Tables } from '@/types/database.types'

type BudgetCategoryRow = Tables<'budget_categories'> & { category: Tables<'expense_categories'> }
type BudgetRow = Tables<'budgets'> & { budget_categories: BudgetCategoryRow[] }

const STATUS_COLOR = { green: 'bg-success', yellow: 'bg-warning', red: 'bg-destructive' } as const

export default function BudgetsPage() {
  const { family } = useFamily()
  const [budget, setBudget] = useState<BudgetRow | null>(null)
  const [categories, setCategories] = useState<Tables<'expense_categories'>[]>([])
  const [expenses, setExpenses] = useState<Tables<'expenses'>[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [b, cats, exp] = await Promise.all([
        financeService.getOrCreateBudget(family.id, new Date()),
        financeService.getCategories(family.id, 'expense'),
        financeService.getExpenses(family.id, new Date()),
      ])
      setBudget(b as unknown as BudgetRow)
      setCategories(cats)
      setExpenses(exp)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      if (!e.category_id) continue
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount_cents)
    }
    return map
  }, [expenses])

  async function handleAmountChange(categoryId: string, value: string) {
    if (!budget) return
    const cents = parseCurrencyToCents(value)
    if (cents === null) return
    await financeService.setBudgetCategoryAmount(budget.id, categoryId, cents)
    await load()
  }

  if (!family) return null

  if (loading || !budget) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const plannedByCategory = new Map(budget.budget_categories.map((bc) => [bc.category_id, bc]))

  if (categories.length === 0) {
    return <EmptyState emoji="🎯" title="Noch keine Kategorien vorhanden" />
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Lege pro Kategorie ein monatliches Budget fest. Die Ampel zeigt, wie es steht.
      </p>
      {categories.map((cat) => {
        const planned = plannedByCategory.get(cat.id)
        const plannedCents = planned?.amount_cents ?? 0
        const spentCents = spentByCategory.get(cat.id) ?? 0
        const status = budgetStatus(spentCents, plannedCents)
        const progress = plannedCents > 0 ? Math.min(100, (spentCents / plannedCents) * 100) : 0

        return (
          <Card key={cat.id}>
            <CardContent className="space-y-2.5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{cat.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Budget</span>
                  <Input
                    defaultValue={plannedCents > 0 ? (plannedCents / 100).toFixed(2).replace('.', ',') : ''}
                    onBlur={(e) => handleAmountChange(cat.id, e.target.value)}
                    placeholder="0,00"
                    className="h-8 w-24 text-right text-sm"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <Progress value={progress} indicatorClassName={cn(STATUS_COLOR[status])} />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(spentCents)} von {formatCurrency(plannedCents)} ausgegeben
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
