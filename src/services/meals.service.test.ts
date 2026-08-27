import { describe, expect, it } from 'vitest'
import { mealsService } from './meals.service'
import type { Tables } from '@/types/database.types'

type Meal = Tables<'meals'> & { recipe: Tables<'recipes'> | null }

function makeRecipe(overrides: Partial<Tables<'recipes'>> = {}): Tables<'recipes'> {
  return {
    id: 'recipe-1',
    family_id: 'family-1',
    name: 'Spaghetti Bolognese',
    image_url: null,
    ingredients: [
      { name: 'Spaghetti', quantity: 500, unit: 'g' },
      { name: 'Tomaten', quantity: 4, unit: 'Stück' },
    ],
    instructions: null,
    prep_minutes: 30,
    servings: 4,
    category: 'Pasta',
    is_favorite: false,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const recipe = overrides.recipe !== undefined ? overrides.recipe : makeRecipe()
  return {
    id: 'meal-1',
    family_id: 'family-1',
    recipe_id: recipe?.id ?? null,
    custom_title: null,
    planned_on: '2026-01-05',
    meal_type: 'dinner',
    servings: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
    recipe,
  }
}

describe('buildShoppingListFromMeals', () => {
  it('merges the same ingredient across multiple meals (e.g. 2 + 4 + 3 Tomaten -> 9 Tomaten)', () => {
    const recipeA = makeRecipe({ id: 'a', ingredients: [{ name: 'Tomaten', quantity: 2, unit: 'Stück' }] })
    const recipeB = makeRecipe({ id: 'b', ingredients: [{ name: 'Tomaten', quantity: 4, unit: 'Stück' }] })
    const recipeC = makeRecipe({ id: 'c', ingredients: [{ name: 'Tomaten', quantity: 3, unit: 'Stück' }] })

    const meals = [
      makeMeal({ id: '1', recipe: recipeA }),
      makeMeal({ id: '2', recipe: recipeB }),
      makeMeal({ id: '3', recipe: recipeC }),
    ]

    const result = mealsService.buildShoppingListFromMeals(meals, [])
    expect(result).toEqual([{ name: 'Tomaten', quantity: 9, unit: 'Stück' }])
  })

  it('scales ingredient quantities when a meal plans a different serving count than the recipe default', () => {
    // Recipe serves 4, meal is planned for 8 servings -> quantities double.
    const recipe = makeRecipe({ servings: 4, ingredients: [{ name: 'Spaghetti', quantity: 500, unit: 'g' }] })
    const meals = [makeMeal({ recipe, servings: 8 })]

    const result = mealsService.buildShoppingListFromMeals(meals, [])
    expect(result).toEqual([{ name: 'Spaghetti', quantity: 1000, unit: 'g' }])
  })

  it('subtracts what is already in the pantry', () => {
    const recipe = makeRecipe({ ingredients: [{ name: 'Nudeln', quantity: 3, unit: 'Packungen' }] })
    const meals = [makeMeal({ recipe })]
    const pantry: Tables<'pantry_items'>[] = [
      {
        id: 'p1',
        family_id: 'family-1',
        name: 'Nudeln',
        quantity: 2,
        unit: 'Packungen',
        category: 'Vorräte',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]

    const result = mealsService.buildShoppingListFromMeals(meals, pantry)
    expect(result).toEqual([{ name: 'Nudeln', quantity: 1, unit: 'Packungen' }])
  })

  it('omits an ingredient entirely once the pantry stock covers it', () => {
    const recipe = makeRecipe({ ingredients: [{ name: 'Milch', quantity: 1, unit: 'Liter' }] })
    const meals = [makeMeal({ recipe })]
    const pantry: Tables<'pantry_items'>[] = [
      { id: 'p1', family_id: 'family-1', name: 'Milch', quantity: 2, unit: 'Liter', category: 'Milchprodukte', updated_at: '2026-01-01T00:00:00Z' },
    ]

    expect(mealsService.buildShoppingListFromMeals(meals, pantry)).toEqual([])
  })

  it('ignores meals without a linked recipe (custom titles)', () => {
    const meals = [makeMeal({ recipe: null, custom_title: 'Reste vom Vortag' })]
    expect(mealsService.buildShoppingListFromMeals(meals, [])).toEqual([])
  })
})
