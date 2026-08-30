import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { financeService } from '@/services/finance.service'
import { formatCurrency } from '@/lib/utils'
import { monthlyReserveCents, savingsRate, totalMonthlyReserveCents } from '@/lib/finance-calculations'
import type { Tables } from '@/types/database.types'

type ExpenseRow = Tables<'expenses'> & { category: Tables<'expense_categories'> | null }
type RecurringExpenseRow = Tables<'recurring_expenses'> & { category: Tables<'expense_categories'> | null }

function startOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function FinanceOverviewPage() {
  const { family } = useFamily()
  const [selectedMonth, setSelectedMonth] = useState(startOfCurrentMonth)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [income, setIncome] = useState<Tables<'income'>[]>([])
  const [recurring, setRecurring] = useState<RecurringExpenseRow[]>([])
  const [recurringIncome, setRecurringIncome] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!family) return
    setLoading(true)
    Promise.all([
      financeService.getExpenses(family.id, selectedMonth),
      financeService.getIncome(family.id, selectedMonth),
      financeService.getRecurringExpenses(family.id),
      financeService.getRecurringIncome(family.id),
    ])
      .then(([exp, inc, rec, recInc]) => {
        setExpenses(exp as ExpenseRow[])
        setIncome(inc)
        setRecurring(rec as RecurringExpenseRow[])
        setRecurringIncome(recInc)
      })
      .finally(() => setLoading(false))
  }, [family?.id, selectedMonth])

  const recurringExpenseReserve = useMemo(() => totalMonthlyReserveCents(recurring), [recurring])
  const recurringIncomeReserve = useMemo(() => totalMonthlyReserveCents(recurringIncome), [recurringIncome])
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount_cents, 0) + recurringExpenseReserve,
    [expenses, recurringExpenseReserve],
  )
  const totalIncome = useMemo(
    () => income.reduce((s, i) => s + i.amount_cents, 0) + recurringIncomeReserve,
    [income, recurringIncomeReserve],
  )
  const savedCents = totalIncome - totalExpenses
  const rate = savingsRate(totalIncome, totalExpenses)

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number }>()
    function add(name: string, color: string, amountCents: number) {
      const existing = map.get(name)
      if (existing) existing.value += amountCents
      else map.set(name, { name, color, value: amountCents })
    }
    for (const e of expenses) add(e.category?.name ?? 'Sonstiges', e.category?.color ?? '#64748b', e.amount_cents)
    for (const r of recurring) {
      add(
        r.category?.name ?? 'Sonstiges',
        r.category?.color ?? '#64748b',
        monthlyReserveCents(r.amount_cents, r.interval, r.custom_interval_months),
      )
    }
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [expenses, recurring])

  const topCategory = byCategory[0]

  if (!family) return null

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  const monthLabel = selectedMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth.getTime() === startOfCurrentMonth().getTime()

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Einnahmen (inkl. fixe Einnahmen)" value={formatCurrency(totalIncome)} tone="success" />
        <StatCard icon={TrendingDown} label="Ausgaben (inkl. Fixkosten)" value={formatCurrency(totalExpenses)} tone="destructive" />
        <StatCard icon={PiggyBank} label="Gespart in diesem Monat" value={formatCurrency(savedCents)} tone="primary" />
        <StatCard icon={Wallet} label="Sparquote" value={`${Math.round(rate * 100)} %`} tone="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ausgaben nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <EmptyState emoji="📊" title="Noch keine Daten" description="Erfasse Ausgaben, um die Verteilung zu sehen." />
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {byCategory.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {byCategory.slice(0, 6).map((c) => (
                    <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="shrink-0 font-medium">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalIncome === 0 && totalExpenses === 0 ? (
              <EmptyState emoji="💡" title="Noch keine Hinweise" description="Sobald Daten vorliegen, siehst du hier hilfreiche Einblicke." />
            ) : (
              <>
                {topCategory && totalExpenses > 0 && (
                  <InsightRow
                    text={`${topCategory.name} macht aktuell ${Math.round((topCategory.value / totalExpenses) * 100)} % eurer Ausgaben aus.`}
                  />
                )}
                {recurringExpenseReserve > 0 && (
                  <InsightRow
                    text={`Darin enthalten: ${formatCurrency(recurringExpenseReserve)} anteilige Fixkosten für diesen Monat.`}
                  />
                )}
                {recurringIncomeReserve > 0 && (
                  <InsightRow text={`Darin enthalten: ${formatCurrency(recurringIncomeReserve)} fixe Einnahmen für diesen Monat.`} />
                )}
                {totalIncome > 0 && (
                  <InsightRow
                    text={
                      savedCents >= 0
                        ? `Ihr habt im ${monthLabel} ${formatCurrency(savedCents)} gespart.`
                        : `Ihr habt im ${monthLabel} ${formatCurrency(Math.abs(savedCents))} mehr ausgegeben als eingenommen.`
                    }
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-sm">
      <p>{text}</p>
    </div>
  )
}

const TONE_CLASSES = {
  success: 'text-success bg-success/10',
  destructive: 'text-destructive bg-destructive/10',
  primary: 'text-primary bg-primary/10',
  default: 'text-foreground bg-muted',
} as const

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  tone: keyof typeof TONE_CLASSES
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
