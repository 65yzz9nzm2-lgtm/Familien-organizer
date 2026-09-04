import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Settings, Trash2, X } from 'lucide-react'
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
import { occurrencesInRange } from '@/lib/finance-calculations'
import { INTERVAL_LABELS } from '@/lib/finance-labels'
import { isSameDay, isSameMonth, monthGridDays, startOfWeek } from '@/lib/calendar-grid'
import type { CalendarEventType, RecurrenceInterval, Tables } from '@/types/database.types'

interface DueItem {
  id: string
  name: string
  amountCents: number
  kind: 'expense' | 'income'
}

type ViewMode = 'week' | 'month' | 'year'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

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

/** [start, end) covering everything visible for the given view around `anchor`. */
function getViewRange(viewMode: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (viewMode === 'week') {
    const start = startOfWeek(anchor)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    return { start, end }
  }
  if (viewMode === 'month') {
    const days = monthGridDays(anchor)
    const start = days[0]
    const last = days[days.length - 1]
    const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    return { start, end }
  }
  const start = new Date(anchor.getFullYear(), 0, 1)
  const end = new Date(anchor.getFullYear() + 1, 0, 1)
  return { start, end }
}

export default function CalendarPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<Tables<'recurring_expenses'>[]>([])
  const [recurringIncome, setRecurringIncome] = useState<Tables<'recurring_income'>[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showDueDates, setShowDueDates] = useState(true)
  const [intervalFilter, setIntervalFilter] = useState<Set<RecurrenceInterval>>(
    () => new Set(Object.keys(INTERVAL_LABELS) as RecurrenceInterval[]),
  )

  const { start: rangeStart, end: rangeEnd } = useMemo(() => getViewRange(viewMode, anchorDate), [viewMode, anchorDate])

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [evts, recExp, recInc] = await Promise.all([
        calendarService.getEvents(family.id, rangeStart, rangeEnd),
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
  }, [family?.id, rangeStart.getTime(), rangeEnd.getTime()])

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

  // Every occurrence of every recurring item within the current view's range, keyed by day -
  // computed once per range/filter change rather than per day, since month/year views need
  // every occurrence in view, not just the next one.
  const dueMap = useMemo(() => {
    const map = new Map<string, DueItem[]>()
    if (!showDueDates) return map
    function add(dateStr: string, item: DueItem) {
      const arr = map.get(dateStr)
      if (arr) arr.push(item)
      else map.set(dateStr, [item])
    }
    for (const r of recurringExpenses) {
      if (!intervalFilter.has(r.interval)) continue
      for (const dateStr of occurrencesInRange(r.next_due_date, r.interval, r.custom_interval_months, rangeStart, rangeEnd)) {
        add(dateStr, { id: r.id, name: r.name, amountCents: r.amount_cents, kind: 'expense' })
      }
    }
    for (const r of recurringIncome) {
      if (!intervalFilter.has(r.interval)) continue
      for (const dateStr of occurrencesInRange(r.next_due_date, r.interval, r.custom_interval_months, rangeStart, rangeEnd)) {
        add(dateStr, { id: r.id, name: r.name, amountCents: r.amount_cents, kind: 'income' })
      }
    }
    return map
  }, [showDueDates, intervalFilter, recurringExpenses, recurringIncome, rangeStart, rangeEnd])

  function dueItemsForDay(day: Date): DueItem[] {
    return dueMap.get(toDateStr(day)) ?? []
  }

  function eventsForDay(day: Date) {
    return events.filter((e) => new Date(e.start_at).toDateString() === day.toDateString())
  }

  function goPrev() {
    setAnchorDate((d) => {
      if (viewMode === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1)
      return new Date(d.getFullYear() - 1, d.getMonth(), 1)
    })
  }

  function goNext() {
    setAnchorDate((d) => {
      if (viewMode === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1)
      return new Date(d.getFullYear() + 1, d.getMonth(), 1)
    })
  }

  function jumpToDay(day: Date) {
    setAnchorDate(day)
    setViewMode('week')
  }

  if (!family || !user) return null

  const today = new Date()
  const isCurrentPeriod =
    viewMode === 'week'
      ? startOfWeek(anchorDate).getTime() === startOfWeek(today).getTime()
      : viewMode === 'month'
        ? isSameMonth(anchorDate, today)
        : anchorDate.getFullYear() === today.getFullYear()

  const rangeLabel =
    viewMode === 'week'
      ? `${formatDate(rangeStart)} – ${formatDate(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - 1))}`
      : viewMode === 'month'
        ? anchorDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : String(anchorDate.getFullYear())

  const weekDays =
    viewMode === 'week'
      ? Array.from({ length: 7 }, (_, i) => new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i))
      : []
  const weekHasContent = viewMode === 'week' && (events.length > 0 || weekDays.some((day) => dueItemsForDay(day).length > 0))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Kalender-Einstellungen"
            className={cn('text-muted-foreground hover:text-foreground', settingsOpen && 'text-foreground')}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            {(['week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'week' ? 'Woche' : mode === 'month' ? 'Monat' : 'Jahr'}
              </button>
            ))}
          </div>
          <Input
            type="date"
            aria-label="Zu Datum springen"
            className="w-40"
            value={toDateStr(anchorDate)}
            onChange={(e) => {
              if (!e.target.value) return
              const [y, m, d] = e.target.value.split('-').map(Number)
              setAnchorDate(new Date(y, m - 1, d))
            }}
          />
          {!isCurrentPeriod && (
            <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
              Heute
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Zurück">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Weiter">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium capitalize text-muted-foreground">{rangeLabel}</p>

      {settingsOpen && (
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
      )}

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
      ) : viewMode === 'week' ? (
        !weekHasContent ? (
          <EmptyState emoji="📅" title="Diese Woche ist noch leer" description="Fügt euren ersten Termin für diese Woche hinzu." />
        ) : (
          <div className="space-y-4">
            {weekDays.map((day) => {
              const dayEvents = eventsForDay(day)
              const dayDue = dueItemsForDay(day)
              if (dayEvents.length === 0 && dayDue.length === 0) return null
              return (
                <Card key={day.toISOString()}>
                  <CardContent className="p-4">
                    <p className="mb-2 text-sm font-semibold">
                      {day.toLocaleDateString('de-DE', { weekday: 'long' })}, {formatDate(day)}
                    </p>
                    <div className="space-y-2">
                      {dayDue.map((d, i) => (
                        <Link
                          key={`${d.id}-${i}`}
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
        )
      ) : viewMode === 'month' ? (
        <MonthGrid anchor={anchorDate} events={events} dueItemsForDay={dueItemsForDay} onSelectDay={jumpToDay} />
      ) : (
        <YearOverview anchor={anchorDate} events={events} dueMap={dueMap} onSelectMonth={(m) => { setAnchorDate(m); setViewMode('month') }} />
      )}
    </div>
  )
}

function MonthGrid({
  anchor,
  events,
  dueItemsForDay,
  onSelectDay,
}: {
  anchor: Date
  events: Tables<'calendar_events'>[]
  dueItemsForDay: (day: Date) => DueItem[]
  onSelectDay: (day: Date) => void
}) {
  const days = useMemo(() => monthGridDays(anchor), [anchor])
  const today = new Date()

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="p-1 text-center text-xs font-medium text-muted-foreground">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = isSameMonth(day, anchor)
            const isToday = isSameDay(day, today)
            const dayEvents = events.filter((e) => new Date(e.start_at).toDateString() === day.toDateString())
            const dayDue = dueItemsForDay(day)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border border-transparent p-1 text-sm hover:border-border hover:bg-muted/40',
                  !inMonth && 'text-muted-foreground/40',
                  isToday && 'border-primary bg-primary/5 font-semibold',
                )}
              >
                <span>{day.getDate()}</span>
                <div className="flex gap-0.5">
                  {dayEvents.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                  {dayDue.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function YearOverview({
  anchor,
  events,
  dueMap,
  onSelectMonth,
}: {
  anchor: Date
  events: Tables<'calendar_events'>[]
  dueMap: Map<string, DueItem[]>
  onSelectMonth: (month: Date) => void
}) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(anchor.getFullYear(), i, 1))

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((month) => {
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
        const monthEventCount = events.filter((e) => isSameMonth(new Date(e.start_at), month)).length
        const monthDueItems = [...dueMap.entries()].filter(([dateStr]) => dateStr.startsWith(monthKey)).flatMap(([, items]) => items)
        return (
          <button
            key={monthKey}
            type="button"
            onClick={() => onSelectMonth(month)}
            className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:bg-muted/40"
          >
            <p className="font-semibold capitalize">{month.toLocaleDateString('de-DE', { month: 'long' })}</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>{monthEventCount > 0 ? `${monthEventCount} Termin${monthEventCount === 1 ? '' : 'e'}` : 'Keine Termine'}</p>
              <p>{monthDueItems.length > 0 ? `${monthDueItems.length} Zahlung${monthDueItems.length === 1 ? '' : 'en'} fällig` : 'Keine Fälligkeiten'}</p>
            </div>
          </button>
        )
      })}
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
