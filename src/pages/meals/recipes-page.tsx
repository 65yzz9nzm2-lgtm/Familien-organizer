import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Clock, Heart, Loader2, Plus, Trash2, Users, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { mealsService } from '@/services/meals.service'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

/** Parses lines like "Tomaten, 2, Stück" into structured ingredients. */
function parseIngredients(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, quantity, unit] = line.split(',').map((p) => p.trim())
      return { name: name ?? line, quantity: Number(quantity) || 1, unit: unit ?? 'Stück' }
    })
}

export default function RecipesPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Tables<'recipes'>[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      const data = await mealsService.getRecipes(family.id)
      setRecipes(data)
      const withImages = data.filter((r) => r.image_url)
      const results = await Promise.allSettled(withImages.map((r) => mealsService.getRecipeImageSignedUrl(r.image_url!)))
      const entries = withImages
        .map((r, i) => {
          const result = results[i]
          return result.status === 'fulfilled' ? ([r.id, result.value] as const) : null
        })
        .filter((entry): entry is readonly [string, string] => entry !== null)
      setImageUrls(Object.fromEntries(entries))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  if (!family || !user) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rezepte</h1>
          <p className="text-sm text-muted-foreground">Eure Familienrezepte, bereit für den Wochenplan</p>
        </div>
        <Link to="/essen" className="text-sm font-medium text-primary hover:underline">
          Zum Essensplan
        </Link>
      </div>

      {formOpen ? (
        <RecipeForm
          onClose={() => setFormOpen(false)}
          onSubmit={async (values) => {
            const imagePath = values.photo ? await mealsService.uploadRecipeImage(family.id, values.photo) : null
            await mealsService.createRecipe({
              family_id: family.id,
              name: values.name,
              ingredients: parseIngredients(values.ingredientsText),
              instructions: values.instructions,
              prep_minutes: values.prepMinutes,
              servings: values.servings,
              category: values.category,
              image_url: imagePath,
              created_by: user.id,
            })
            setFormOpen(false)
            await load()
          }}
        />
      ) : (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Rezept
        </Button>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState emoji="🍝" title="Was kocht ihr gerne?" description="Fügt euer erstes Familienrezept hinzu." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              {imageUrls[r.id] && (
                <img src={imageUrls[r.id]} alt={r.name} className="h-32 w-full object-cover" />
              )}
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <p className="font-semibold">{r.name}</p>
                  <button
                    onClick={async () => {
                      await mealsService.toggleFavorite(r.id, !r.is_favorite)
                      await load()
                    }}
                    aria-label="Favorit"
                  >
                    <Heart className={cn('h-4 w-4', r.is_favorite ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {r.prep_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {r.prep_minutes} Min.
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {r.servings} Port.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{r.ingredients.length} Zutaten</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    await mealsService.deleteRecipe(r.id, r.image_url)
                    setRecipes((prev) => prev.filter((x) => x.id !== r.id))
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function RecipeForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (values: {
    name: string
    ingredientsText: string
    instructions: string
    prepMinutes: number
    servings: number
    category: string
    photo: File | null
  }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [instructions, setInstructions] = useState('')
  const [prepMinutes, setPrepMinutes] = useState('30')
  const [servings, setServings] = useState('4')
  const [category, setCategory] = useState('Sonstiges')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handlePhotoSelected(file: File | undefined) {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    if (!file) {
      setPhoto(null)
      setPhotoPreview(null)
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte gib einen Namen ein.')
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        ingredientsText,
        instructions,
        prepMinutes: Number(prepMinutes) || 0,
        servings: Number(servings) || 4,
        category,
        photo,
      })
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    } catch {
      setError('Konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Rezept hinzufügen</p>
        <button type="button" onClick={onClose} aria-label="Schließen" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spaghetti Bolognese" autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kategorie</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Foto (optional)</Label>
        <div className="flex items-center gap-3">
          {photoPreview ? (
            <img src={photoPreview} alt="Vorschau" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Camera className="h-6 w-6" />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
            <Camera className="h-4 w-4" /> Foto wählen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSelected(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Zubereitungszeit (Min.)</Label>
          <Input type="number" min={0} value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Portionen</Label>
          <Input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Zutaten (eine pro Zeile: Name, Menge, Einheit)</Label>
        <Textarea
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder={'Spaghetti, 500, g\nHackfleisch, 400, g\nTomaten, 4, Stück'}
          rows={4}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Zubereitung (optional)</Label>
        <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Speichern
      </Button>
    </form>
  )
}
