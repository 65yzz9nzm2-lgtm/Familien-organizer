import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { calendarService } from '@/services/calendar.service'
import { financeService } from '@/services/finance.service'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { INTERVAL_LABELS } from '@/lib/finance-labels'
import type { CalendarEventType, RecurrenceInterval, Tables } from '@/types/database.types'

interface DueItem {
  id: string
  name: string
  amountCents: number
  kind: 'expense' | 'income'
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EVENT_LABELS: Record<CalendarEventType, string> = {
  family: 'Familie',
  private: 'Privat',
  school: 'Schule',
  sport: 'Sport',
  doctor: 'Arzt',
  work: 'Arbeit',
  birthday: 'Geburtstag',
  vacation: 'Urlaub',
  payment: 'Zahlung',
  shopping: 'Einkauf',
  meal: 'Essen',
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CalendarPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<Tables<'recurring_expenses'>[]>([])
  const [recurringIncome, setRecurringIncome] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [showDueDates, setShowDueDates] = useState(true)
  const [intervalFilter, setIntervalFilter] = useState<Set<RecurrenceInterval>>(
    () => new Set(Object.keys(INTERVAL_LABELS) as RecurrenceInterval[]),
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
    [weekStart],
  )

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + 7)
      const [evts, recExp, recInc] = await Promise.all([
        calendarService.getEvents(family.id, weekStart, rangeEnd),
        financeService.getRecurringExpenses(family.id),
        financeService.getRecurringIncome(family.id),
      ])
      setEvents(evts)
      setRecurringExpenses(recExp)
      setRecurringIncome(recInc)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, weekStart])

  async function handleDelete(id: string) {
    await calendarService.deleteEvent(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  function toggleInterval(interval: RecurrenceInterval) {
    setIntervalFilter((prev) => {
      const next = new Set(prev)
      if (next.has(interval)) next.delete(interval)
      else next.add(interval)
      return next
    })
  }

  function dueItemsForDay(day: Date): DueItem[] {
    if (!showDueDates) return []
    const dateStr = toDateStr(day)
    const due: DueItem[] = []
    for (const r of recurringExpenses) {
      if (r.next_due_date === dateStr && intervalFilter.has(r.interval)) {
        due.push({ id: r.id, name: r.name, amountCents: r.amount_cents, kind: 'expense' })
      }
    }
    for (const r of recurringIncome) {
      if (r.next_due_date === dateStr && intervalFilter.has(r.interval)) {
        due.push({ id: r.id, name: r.name, amountCents: r.amount_cents, kind: 'income' })
      }
    }
    return due
  }

  if (!family || !user) return null

  const weekHasContent = events.length > 0 || (showDueDates && weekDays.some((day) => dueItemsForDay(day).length > 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={showDueDates} onChange={(e) => setShowDueDates(e.target.checked)} className="h-4 w-4" />
          Zahlungsfälligkeiten anzeigen
        </label>
        {showDueDates && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(Object.entries(INTERVAL_LABELS) as [RecurrenceInterval, string][]).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={intervalFilter.has(value)}
                  onChange={() => toggleInterval(value)}
                  className="h-3.5 w-3.5"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      {formOpen ? (
        <EventForm
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await calendarService.createEvent({
              family_id: family.id,
              title: values.title,
              event_type: values.eventType,
              start_at: values.startAt,
              end_at: values.endAt,
              is_private: values.isPrivate,
              owner_id: user.id,
              created_by: user.id,
            })
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Termin
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !weekHasContent ? (
        <EmptyState emoji="📅" title="Euer Kalender ist noch leer" description="Fügt euren ersten gemeinsamen Termin hinzu." />
      ) : (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayEvents = events.filter((e) => new Date(e.start_at).toDateString() === day.toDateString())
            const dayDue = dueItemsForDay(day)
            if (dayEvents.length === 0 && dayDue.length === 0) return null
            return (
              <Card key={day.toISOString()}>
                <CardContent className="p-4">
                  <p className="mb-2 text-sm font-semibold">
                    {day.toLocaleDateString('de-DE', { weekday: 'long' })}, {formatDate(day)}
                  </p>
                  <div className="space-y-2">
                    {dayDue.map((d) => (
                      <Link
                        key={d.id}
                        to={d.kind === 'expense' ? '/finanzen/fixkosten' : '/finanzen/fixe-einnahmen'}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-3">
                          <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{d.name}</p>
                            <Badge variant="secondary">Zahlung fällig</Badge>
                          </div>
                        </div>
                        <p className={cn('text-sm font-semibold', d.kind === 'income' ? 'text-success' : 'text-foreground')}>
                          {d.kind === 'income' ? '+' : ''}
                          {formatCurrency(d.amountCents)}
                        </p>
                      </Link>
                    ))}
                    {dayEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-medium text-muted-foreground tabular-nums">
                            {e.all_day
                              ? 'Ganztägig'
                              : new Date(e.start_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            <Badge variant="secondary">{EVENT_LABELS[e.event_type]}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} aria-label="Löschen">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (values: { title: string; eventType: CalendarEventType; startAt: string; endAt: string; isPrivate: boolean }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('family')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('19:00')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Bitte gib einen Titel ein.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        eventType,
        startAt: new Date(`${date}T${startTime}`).toISOString(),
        endAt: new Date(`${date}T${endTime}`).toISOString(),
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
        <p className="text-sm font-semibold">Termin hinzufügen</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Titel</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Von</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bis</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Typ</Label>
          <Select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventType)}>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sichtbarkeit</Label>
          <Select value={isPrivate ? 'private' : 'shared'} onChange={(e) => setIsPrivate(e.target.value === 'private')}>
            <option value="shared">Familie</option>
            <option value="private">Privat</option>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className={cn('w-full')} disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
