import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Download, Printer, TrendingDown, TrendingUp, PiggyBank, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { financeService } from '@/services/finance.service'
import {
  buildMonthlyTotalsWithRecurring,
  monthKeysInRange,
  monthlyReserveCents,
  savingsRate,
  totalMonthlyReserveCents,
} from '@/lib/finance-calculations'
import { buildTransactionsCsv, downloadCsv, type CsvTransactionRow } from '@/lib/export'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type ExpenseRow = Tables<'expenses'> & { category: Tables<'expense_categories'> | null }
type RecurringExpenseRow = Tables<'recurring_expenses'> & { category: Tables<'expense_categories'> | null }
type PeriodMode = 'year' | 'range'

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function currentYear() {
  return new Date().getFullYear()
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function StatisticsPage() {
  const { family } = useFamily()
  const [mode, setMode] = useState<PeriodMode>('year')
  const [year, setYear] = useState(currentYear())
  const [rangeStart, setRangeStart] = useState(() => toDateInputValue(new Date(currentYear(), 0, 1)))
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(new Date()))
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [income, setIncome] = useState<Tables<'income'>[]>([])
  const [recurring, setRecurring] = useState<RecurringExpenseRow[]>([])
  const [recurringIncome, setRecurringIncome] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)

  const { periodStart, periodEnd } = useMemo(() => {
    if (mode === 'year') {
      return { periodStart: new Date(year, 0, 1), periodEnd: new Date(year + 1, 0, 1) }
    }
    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    end.setDate(end.getDate() + 1) // inclusive end date -> exclusive range boundary
    return { periodStart: start, periodEnd: end }
  }, [mode, year, rangeStart, rangeEnd])

  useEffect(() => {
    if (!family) return
    setLoading(true)
    Promise.all([
      financeService.getExpensesInRange(family.id, periodStart, periodEnd),
      financeService.getIncomeInRange(family.id, periodStart, periodEnd),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, periodStart.getTime(), periodEnd.getTime()])

  const periodMonthKeys = useMemo(() => monthKeysInRange(periodStart, periodEnd), [periodStart, periodEnd])
  const recurringExpenseReserve = useMemo(() => totalMonthlyReserveCents(recurring), [recurring])
  const recurringIncomeReserve = useMemo(() => totalMonthlyReserveCents(recurringIncome), [recurringIncome])
  const recurringExpenseTotal = recurringExpenseReserve * periodMonthKeys.length
  const recurringIncomeTotal = recurringIncomeReserve * periodMonthKeys.length

  const totalExpenses = expenses.reduce((s, e) => s + e.amount_cents, 0) + recurringExpenseTotal
  const totalIncome = income.reduce((s, i) => s + i.amount_cents, 0) + recurringIncomeTotal
  const rate = savingsRate(totalIncome, totalExpenses)

  const monthly = useMemo(
    () => buildMonthlyTotalsWithRecurring(periodMonthKeys, expenses, income, recurringExpenseReserve, recurringIncomeReserve),
    [periodMonthKeys, expenses, income, recurringExpenseReserve, recurringIncomeReserve],
  )
  const chartData = monthly.map((m) => {
    const [, monthNum] = m.monthKey.split('-')
    return {
      month: MONTH_LABELS[Number(monthNum) - 1],
      Einnahmen: m.incomeCents / 100,
      Ausgaben: m.expenseCents / 100,
    }
  })

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
        monthlyReserveCents(r.amount_cents, r.interval, r.custom_interval_months) * periodMonthKeys.length,
      )
    }
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [expenses, recurring, periodMonthKeys])

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear() - i)

  function handleExportCsv() {
    const rows: CsvTransactionRow[] = [
      ...expenses.map((e): CsvTransactionRow => ({
        date: e.occurred_on,
        type: 'Ausgabe',
        category: e.category?.name ?? 'Sonstiges',
        amountCents: e.amount_cents,
        note: e.note ?? '',
      })),
      ...income.map((i): CsvTransactionRow => ({
        date: i.occurred_on,
        type: 'Einnahme',
        category: i.source_type,
        amountCents: i.amount_cents,
        note: i.note ?? '',
      })),
    ].sort((a, b) => a.date.localeCompare(b.date))

    const periodLabel = mode === 'year' ? String(year) : `${rangeStart}_bis_${rangeEnd}`
    downloadCsv(`familyhub-finanzen-${periodLabel}.csv`, buildTransactionsCsv(rows))
  }

  if (!family) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Zeitraum</label>
            <Select value={mode} onChange={(e) => setMode(e.target.value as PeriodMode)} className="w-40">
              <option value="year">Ganzes Jahr</option>
              <option value="range">Zeitraum</option>
            </Select>
          </div>
          {mode === 'year' ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Jahr</label>
              <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Von</label>
                <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Bis</label>
                <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="w-40" />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={loading || (expenses.length === 0 && income.length === 0)}>
            <Download className="h-4 w-4" /> CSV exportieren
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={loading}>
            <Printer className="h-4 w-4" /> Drucken / PDF
          </Button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">
          FamilyHub – Finanzstatistik {mode === 'year' ? year : `${rangeStart} bis ${rangeEnd}`}
        </h1>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : expenses.length === 0 && income.length === 0 && recurring.length === 0 && recurringIncome.length === 0 ? (
        <EmptyState emoji="📊" title="Keine Daten für diesen Zeitraum" description="Wähle ein anderes Jahr oder einen anderen Zeitraum." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={TrendingUp} label="Einnahmen (inkl. fixe Einnahmen)" value={formatCurrency(totalIncome)} tone="success" />
            <StatCard icon={TrendingDown} label="Ausgaben (inkl. Fixkosten)" value={formatCurrency(totalExpenses)} tone="destructive" />
            <StatCard icon={PiggyBank} label="Ersparnis" value={formatCurrency(totalIncome - totalExpenses)} tone="primary" />
            <StatCard icon={Wallet} label="Sparquote" value={`${Math.round(rate * 100)} %`} tone="default" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Einnahmen vs. Ausgaben pro Monat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value) * 100)} />
                    <Legend />
                    <Bar dataKey="Einnahmen" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ausgaben" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ausgaben nach Kategorie</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Ausgaben in diesem Zeitraum.</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
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
                    {byCategory.map((c) => (
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
        </>
      )}
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
