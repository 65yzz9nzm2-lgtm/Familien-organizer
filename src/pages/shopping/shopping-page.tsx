import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { mealsService } from '@/services/meals.service'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

const CATEGORIES = ['Obst & Gemüse', 'Milchprodukte', 'Fleisch', 'Vorräte', 'Getränke', 'Haushalt', 'Sonstiges']

type ListWithItems = Tables<'shopping_lists'> & { shopping_items: Tables<'shopping_items'>[] }

export default function ShoppingPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [list, setList] = useState<ListWithItems | null>(null)
  const [pantry, setPantry] = useState<Tables<'pantry_items'>[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])

  async function load() {
    if (!family || !user) return
    setLoading(true)
    try {
      const [l, p] = await Promise.all([mealsService.getOrCreateDefaultList(family.id, user.id), mealsService.getPantryItems(family.id)])
      setList(l as ListWithItems)
      setPantry(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !list) return
    await mealsService.addShoppingItem({ list_id: list.id, name: name.trim(), category })
    setName('')
    await load()
  }

  async function handleToggle(item: Tables<'shopping_items'>) {
    await mealsService.toggleShoppingItem(item.id, !item.is_checked)
    await load()
  }

  async function handleDelete(id: string) {
    await mealsService.deleteShoppingItem(id)
    await load()
  }

  async function handleGenerateFromPlan() {
    if (!family || !list) return
    setGenerating(true)
    try {
      const weekStart = new Date()
      weekStart.setHours(0, 0, 0, 0)
      const meals = await mealsService.getWeekPlan(family.id, weekStart)
      const ingredients = mealsService.buildShoppingListFromMeals(meals, pantry)
      for (const ingredient of ingredients) {
        await mealsService.addShoppingItem({
          list_id: list.id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: 'Obst & Gemüse',
          source: 'recipe',
        })
      }
      await load()
    } finally {
      setGenerating(false)
    }
  }

  if (!family) return null

  const items = list?.shopping_items ?? []
  const grouped = CATEGORIES.map((cat) => ({ category: cat, items: items.filter((i) => i.category === cat) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Einkaufsliste</h1>
        <Button variant="outline" onClick={handleGenerateFromPlan} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Aus Essensplan erstellen
        </Button>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Artikel hinzufügen…" className="flex-1" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-40">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Button type="submit" size="icon" aria-label="Hinzufügen">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState emoji="🛒" title="Eure Einkaufsliste ist leer" description="Fügt Artikel hinzu oder generiert sie aus dem Essensplan." />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.category}>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{g.category}</p>
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {g.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                      <button className="flex items-center gap-3 text-left" onClick={() => handleToggle(item)}>
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md border-2',
                            item.is_checked ? 'border-success bg-success' : 'border-border',
                          )}
                        />
                        <span className={cn('text-sm', item.is_checked && 'text-muted-foreground line-through')}>
                          {item.name}
                          {item.quantity && item.quantity !== 1 && (
                            <span className="text-muted-foreground"> · {item.quantity} {item.unit}</span>
                          )}
                        </span>
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Löschen">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vorrat</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pantry.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch kein Vorrat erfasst.</p>
          ) : (
            pantry.map((p) => (
              <span key={p.id} className="rounded-full border border-border px-3 py-1 text-xs">
                {p.name} · {p.quantity} {p.unit}
              </span>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
