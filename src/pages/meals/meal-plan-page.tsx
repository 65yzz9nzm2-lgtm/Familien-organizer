import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { mealsService } from '@/services/meals.service'
import { formatDate } from '@/lib/utils'
import type { MealType, Tables } from '@/types/database.types'

const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack' }
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

type MealRow = Tables<'meals'> & { recipe: Tables<'recipes'> | null }

export default function MealPlanPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [meals, setMeals] = useState<MealRow[]>([])
  const [recipes, setRecipes] = useState<Tables<'recipes'>[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerFor, setPickerFor] = useState<{ date: string; mealType: MealType } | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const [m, r] = await Promise.all([mealsService.getWeekPlan(family.id, weekStart), mealsService.getRecipes(family.id)])
      setMeals(m as MealRow[])
      setRecipes(r)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, weekStart])

  if (!family || !user) return null

  async function handlePick(recipeId: string) {
    if (!pickerFor || !family || !user) return
    await mealsService.planMeal({
      family_id: family.id,
      recipe_id: recipeId,
      planned_on: pickerFor.date,
      meal_type: pickerFor.mealType,
      created_by: user.id,
    })
    setPickerFor(null)
    await load()
  }

  async function handleRemove(id: string) {
    await mealsService.removeMeal(id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Essensplan</h1>
        <div className="flex items-center gap-2">
          <Link to="/rezepte" className="text-sm font-medium text-primary hover:underline">
            Rezepte
          </Link>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {recipes.length === 0 && !loading ? (
        <EmptyState emoji="🍽️" title="Noch keine Rezepte" description="Legt zuerst ein paar Rezepte an, um sie einzuplanen." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((day) => {
            const dateStr = day.toISOString().slice(0, 10)
            return (
              <Card key={dateStr}>
                <CardContent className="space-y-2 p-3">
                  <p className="text-xs font-semibold">
                    {day.toLocaleDateString('de-DE', { weekday: 'short' })} {formatDate(day)}
                  </p>
                  {MEAL_TYPES.map((mealType) => {
                    const meal = meals.find((m) => m.planned_on === dateStr && m.meal_type === mealType)
                    return (
                      <div key={mealType} className="rounded-lg border border-border p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">{MEAL_LABELS[mealType]}</p>
                        {meal ? (
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-xs font-medium">{meal.recipe?.name ?? meal.custom_title}</p>
                            <button onClick={() => handleRemove(meal.id)} aria-label="Entfernen">
                              <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPickerFor({ date: dateStr, mealType })}
                            className="flex items-center gap-1 text-xs text-primary"
                          >
                            <Plus className="h-3 w-3" /> Rezept
                          </button>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPickerFor(null)}>
          <div className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-card p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold">Rezept auswählen</p>
            <Select onChange={(e) => e.target.value && handlePick(e.target.value)} defaultValue="">
              <option value="" disabled>
                Rezept wählen…
              </option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
