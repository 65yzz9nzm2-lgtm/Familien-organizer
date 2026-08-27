import { useEffect, useState, type FormEvent } from 'react'
import { Check, Loader2, Plus, RotateCcw, Trash2, Trophy, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { tasksService } from '@/services/tasks.service'
import { cn, formatDate } from '@/lib/utils'
import type { TaskPriority, Tables } from '@/types/database.types'

const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' }
const PRIORITY_COLOR: Record<TaskPriority, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
}

type TaskRow = Tables<'tasks'> & { task_assignments: Tables<'task_assignments'>[] }

export default function TasksPage() {
  const { family, members } = useFamily()
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [rewards, setRewards] = useState<Tables<'rewards'>[]>([])
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [t, r, b] = await Promise.all([
        tasksService.getTasks(family.id),
        tasksService.getRewards(family.id),
        tasksService.getPointsBalances(family.id),
      ])
      setTasks(t as TaskRow[])
      setRewards(r)
      setBalances(b)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  if (!family || !user) return null

  const openTasks = tasks.filter((t) => t.status === 'open')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const myPoints = balances.get(user.id) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-sm text-muted-foreground">Wer macht was – und sammelt dabei Punkte</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Trophy className="h-4 w-4" /> {myPoints} Punkte
        </div>
      </div>

      {formOpen ? (
        <TaskForm
          members={members}
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            await tasksService.createTask(
              {
                family_id: family.id,
                title: values.title,
                due_date: values.dueDate || null,
                priority: values.priority,
                points: values.points,
                created_by: user.id,
              },
              values.assigneeIds,
            )
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Aufgabe
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState emoji="✅" title="Noch keine Aufgaben" description="Legt eure erste Aufgabe an, z. B. Müll rausbringen." />
      ) : (
        <div className="space-y-2">
          {openTasks.map((task) => (
            <TaskRowItem
              key={task.id}
              task={task}
              members={members}
              onComplete={async () => {
                await tasksService.completeTask(task)
                await load()
              }}
              onDelete={async () => {
                await tasksService.deleteTask(task.id)
                await load()
              }}
            />
          ))}
          {doneTasks.length > 0 && (
            <details className="pt-2">
              <summary className="cursor-pointer text-sm text-muted-foreground">{doneTasks.length} erledigt</summary>
              <div className="mt-2 space-y-2">
                {doneTasks.map((task) => (
                  <TaskRowItem
                    key={task.id}
                    task={task}
                    members={members}
                    onReopen={async () => {
                      await tasksService.reopenTask(task.id)
                      await load()
                    }}
                    onDelete={async () => {
                      await tasksService.deleteTask(task.id)
                      await load()
                    }}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Belohnungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Belohnungen definiert.</p>
          ) : (
            rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{r.title}</p>
                <Badge>{r.points_cost} Punkte</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TaskRowItem({
  task,
  members,
  onComplete,
  onReopen,
  onDelete,
}: {
  task: TaskRow
  members: Tables<'family_members'>[]
  onComplete?: () => void
  onReopen?: () => void
  onDelete: () => void
}) {
  const assignees = members.filter((m) => task.task_assignments.some((a) => a.user_id === m.user_id))
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border border-border p-3', task.status === 'done' && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <button
          onClick={onComplete ?? onReopen}
          aria-label={task.status === 'open' ? 'Erledigt' : 'Wieder öffnen'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border-2',
            task.status === 'done' ? 'border-success bg-success text-success-foreground' : 'border-border text-transparent hover:border-primary',
          )}
        >
          {task.status === 'done' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
        </button>
        <div>
          <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through')}>{task.title}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
            {task.points > 0 && <Badge variant="secondary">{task.points} P.</Badge>}
            {task.due_date && <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {assignees.map((m) => (
            <Avatar key={m.id} name={m.display_name ?? ''} color={m.color} src={m.avatar_url} className="h-7 w-7 border-2 border-card" />
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Löschen">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

function TaskForm({
  members,
  onSubmit,
  onClose,
}: {
  members: Tables<'family_members'>[]
  onSubmit: (values: { title: string; dueDate: string; priority: TaskPriority; points: number; assigneeIds: string[] }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [points, setPoints] = useState('5')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Bitte gib einen Titel ein.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ title: title.trim(), dueDate, priority, points: Number(points) || 0, assigneeIds })
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Aufgabe hinzufügen</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Titel</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Müll rausbringen" autoFocus />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fällig am</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priorität</Label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Punkte</Label>
          <Input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Zuweisen an</Label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => toggleAssignee(m.user_id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                assigneeIds.includes(m.user_id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {m.display_name ?? 'Mitglied'}
            </button>
          ))}
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
