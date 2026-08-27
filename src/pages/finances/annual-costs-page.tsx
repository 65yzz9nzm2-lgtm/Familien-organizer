import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { financeService } from '@/services/finance.service'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { monthlyReserveCents } from '@/lib/finance-calculations'
import type { Tables } from '@/types/database.types'

type RecurringRow = Tables<'recurring_expenses'> & { category: Tables<'expense_categories'> | null }

export default function AnnualCostsPage() {
  const { family } = useFamily()
  const navigate = useNavigate()
  const [items, setItems] = useState<RecurringRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!family) return
    setLoading(true)
    financeService
      .getRecurringExpenses(family.id)
      .then((data) => setItems((data as RecurringRow[]).filter((i) => i.interval === 'annual')))
      .finally(() => setLoading(false))
  }, [family?.id])

  if (!family) return null

  const totalAnnual = items.reduce((sum, i) => sum + i.amount_cents, 0)
  const totalMonthlyReserve = items.reduce((sum, i) => sum + monthlyReserveCents(i.amount_cents, i.interval, i.custom_interval_months), 0)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="📅"
        title="Noch keine Jahreskosten hinterlegt"
        description="Autoversicherung, Kfz-Steuer, Urlaub & Co. — lege sie unter Fixkosten mit Intervall 'jährlich' an."
        actionLabel="Zu den Fixkosten"
        onAction={() => navigate('/finanzen/fixkosten')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Gesamte Jahreskosten</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAnnual)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Empfohlene monatliche Rücklage</p>
            <p className="text-2xl font-bold">{formatCurrency(totalMonthlyReserve)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">Fällig am {formatDate(item.next_due_date)}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(item.amount_cents)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to="/finanzen/fixkosten" className={cn(buttonVariants({ variant: 'outline' }))}>
        Weitere Jahreskosten hinzufügen
      </Link>
    </div>
  )
}
