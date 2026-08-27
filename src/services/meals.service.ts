import { supabase } from '@/lib/supabase'
import type { Inserts, Tables } from '@/types/database.types'

export const mealsService = {
  async getRecipes(familyId: string) {
    const { data, error } = await supabase.from('recipes').select('*').eq('family_id', familyId).order('name')
    if (error) throw error
    return data ?? []
  },

  async createRecipe(input: Inserts<'recipes'>) {
    const { data, error } = await supabase.from('recipes').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteRecipe(id: string) {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) throw error
  },

  async toggleFavorite(id: string, isFavorite: boolean) {
    const { error } = await supabase.from('recipes').update({ is_favorite: isFavorite }).eq('id', id)
    if (error) throw error
  },

  async getWeekPlan(familyId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const { data, error } = await supabase
      .from('meals')
      .select('*, recipe:recipes(*)')
      .eq('family_id', familyId)
      .gte('planned_on', weekStart.toISOString().slice(0, 10))
      .lt('planned_on', weekEnd.toISOString().slice(0, 10))
    if (error) throw error
    return data ?? []
  },

  async planMeal(input: Inserts<'meals'>) {
    const { data, error } = await supabase.from('meals').insert(input).select('*, recipe:recipes(*)').single()
    if (error) throw error
    return data
  },

  async removeMeal(id: string) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (error) throw error
  },

  async getOrCreateDefaultList(familyId: string, userId: string) {
    const { data: existing, error: selectError } = await supabase
      .from('shopping_lists')
      .select('*, shopping_items(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (selectError) throw selectError
    if (existing) return existing

    const { data: created, error: insertError } = await supabase
      .from('shopping_lists')
      .insert({ family_id: familyId, created_by: userId })
      .select('*, shopping_items(*)')
      .single()
    if (insertError) throw insertError
    return created
  },

  async addShoppingItem(input: Inserts<'shopping_items'>) {
    const { data, error } = await supabase.from('shopping_items').insert(input).select().single()
    if (error) throw error
    return data
  },

  async toggleShoppingItem(id: string, isChecked: boolean) {
    const { error } = await supabase.from('shopping_items').update({ is_checked: isChecked }).eq('id', id)
    if (error) throw error
  },

  async deleteShoppingItem(id: string) {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) throw error
  },

  async getPantryItems(familyId: string) {
    const { data, error } = await supabase.from('pantry_items').select('*').eq('family_id', familyId).order('name')
    if (error) throw error
    return data ?? []
  },

  async upsertPantryItem(input: Inserts<'pantry_items'>) {
    const { data, error } = await supabase
      .from('pantry_items')
      .upsert(input, { onConflict: 'family_id,name' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deletePantryItem(id: string) {
    const { error } = await supabase.from('pantry_items').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Merges ingredients from the given recipes (scaled to target servings) into
   * a single { name -> { quantity, unit } } map, and subtracts pantry stock.
   */
  buildShoppingListFromMeals(
    meals: (Tables<'meals'> & { recipe: Tables<'recipes'> | null })[],
    pantry: Tables<'pantry_items'>[],
  ) {
    const merged = new Map<string, { name: string; quantity: number; unit: string }>()

    for (const meal of meals) {
      if (!meal.recipe) continue
      const scale = (meal.servings ?? meal.recipe.servings) / meal.recipe.servings
      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
        const existing = merged.get(key)
        const scaledQuantity = ingredient.quantity * scale
        if (existing) existing.quantity += scaledQuantity
        else merged.set(key, { name: ingredient.name, quantity: scaledQuantity, unit: ingredient.unit })
      }
    }

    const pantryByName = new Map(pantry.map((p) => [`${p.name.toLowerCase()}|${p.unit}`, p.quantity]))

    return [...merged.entries()]
      .map(([key, value]) => {
        const inPantry = pantryByName.get(key) ?? 0
        const remaining = Math.max(0, value.quantity - inPantry)
        return { name: value.name, quantity: remaining, unit: value.unit }
      })
      .filter((item) => item.quantity > 0)
  },
}
