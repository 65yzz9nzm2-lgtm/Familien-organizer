import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ListChecks, PiggyBank, Plus, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { calendarService } from '@/services/calendar.service'
import { financeService } from '@/services/finance.service'
import { tasksService } from '@/services/tasks.service'
import { goalsService } from '@/services/goals.service'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

type GoalRow = Tables<'goals'> & { goal_transactions: Tables<'goal_transactions'>[] }
type TaskRow = Tables<'tasks'> & { task_assignments: Tables<'task_assignments'>[] }

export default function DashboardPage() {
  const { family, membership } = useFamily()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>([])
  const [expenses, setExpenses] = useState<Tables<'expenses'>[]>([])
  const [income, setIncome] = useState<Tables<'income'>[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [goals, setGoals] = useState<GoalRow[]>([])

  useEffect(() => {
    if (!family) return
    setLoading(true)
    Promise.all([
      calendarService.getUpcoming(family.id, 5),
      financeService.getExpenses(family.id, new Date()),
      financeService.getIncome(family.id, new Date()),
      tasksService.getTasks(family.id),
      goalsService.getGoals(family.id),
    ])
      .then(([ev, exp, inc, t, g]) => {
        setEvents(ev)
        setExpenses(exp)
        setIncome(inc)
        setTasks((t as TaskRow[]).filter((task) => task.status === 'open'))
        setGoals(g as GoalRow[])
      })
      .finally(() => setLoading(false))
  }, [family?.id])

  if (!family) return null

  const firstName = membership?.display_name ?? 'zusammen'
  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'

  const totalExpenses = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const totalIncome = income.reduce((s, i) => s + i.amount_cents, 0)
  const todayEvents = events.filter((e) => new Date(e.start_at).toDateString() === new Date().toDateString())
  const myTasks = tasks.filter((t) => user && t.task_assignments.some((a) => a.user_id === user.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Wird geladen…'
            : todayEvents.length > 0
              ? `Heute stehen ${todayEvents.length} ${todayEvents.length === 1 ? 'Ding' : 'Dinge'} an.`
              : 'Heute steht nichts Besonderes an.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickAction icon={Wallet} label="Ausgabe" href="/finanzen/ausgaben" />
        <QuickAction icon={PiggyBank} label="Einnahme" href="/finanzen/einnahmen" />
        <QuickAction icon={CalendarDays} label="Termin" href="/kalender" />
        <QuickAction icon={ListChecks} label="Aufgabe" href="/aufgaben" />
        <QuickAction icon={Plus} label="Einkauf" href="/einkauf" />
        <QuickAction icon={Plus} label="Mahlzeit" href="/essen" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Heute & bald</CardTitle>
            <Link to="/kalender" className="text-xs font-medium text-primary hover:underline">
              Kalender
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : events.length === 0 ? (
              <EmptyState emoji="📅" title="Euer Kalender ist noch leer" description="Fügt euren ersten Termin hinzu." />
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{e.title}</p>
                    <Badge variant="secondary">
                      {new Date(e.start_at).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Finanzen</CardTitle>
            <Link to="/finanzen" className="text-xs font-medium text-primary hover:underline">
              Details
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Einnahmen</span>
              <span className="font-medium text-success">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ausgaben</span>
              <span className="font-medium text-destructive">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Saldo</span>
              <span>{formatCurrency(totalIncome - totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Offene Aufgaben</CardTitle>
            <Link to="/aufgaben" className="text-xs font-medium text-primary hover:underline">
              Alle
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : myTasks.length === 0 ? (
              <EmptyState emoji="✅" title="Keine offenen Aufgaben für dich" />
            ) : (
              <div className="space-y-2">
                {myTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    {t.title}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Familienziele</CardTitle>
            <Link to="/ziele" className="text-xs font-medium text-primary hover:underline">
              Alle
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : goals.length === 0 ? (
              <EmptyState emoji="🏝️" title="Noch keine Sparziele" />
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 2).map((g) => {
                  const saved = g.goal_transactions.reduce((s, t) => s + t.amount_cents, 0)
                  return (
                    <div key={g.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{g.title}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(saved)} / {formatCurrency(g.target_amount_cents)}
                        </span>
                      </div>
                      <Progress value={(saved / g.target_amount_cents) * 100} />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, href }: { icon: typeof Wallet; label: string; href: string }) {
  return (
    <Link
      to={href}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
