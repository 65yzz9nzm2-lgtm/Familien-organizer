import { supabase } from '@/lib/supabase'
import type { Inserts, Tables } from '@/types/database.types'

function monthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export const financeService = {
  async getCategories(familyId: string, kind: 'expense' | 'income' = 'expense') {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .or(`family_id.eq.${familyId},family_id.is.null`)
      .eq('kind', kind)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async createCategory(familyId: string, input: Pick<Tables<'expense_categories'>, 'name' | 'icon' | 'color'> & { kind?: 'expense' | 'income' }) {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ family_id: familyId, kind: input.kind ?? 'expense', name: input.name, icon: input.icon, color: input.color })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getExpenses(familyId: string, month: Date) {
    const { start, end } = monthRange(month)
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .eq('family_id', familyId)
      .gte('occurred_on', start)
      .lt('occurred_on', end)
      .order('occurred_on', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /** Expenses in an arbitrary [start, end) range, e.g. for a year or custom statistics period. */
  async getExpensesInRange(familyId: string, start: Date, end: Date) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .eq('family_id', familyId)
      .gte('occurred_on', start.toISOString().slice(0, 10))
      .lt('occurred_on', end.toISOString().slice(0, 10))
      .order('occurred_on', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async addExpense(input: Inserts<'expenses'>) {
    const { data, error } = await supabase.from('expenses').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  async getIncome(familyId: string, month: Date) {
    const { start, end } = monthRange(month)
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('family_id', familyId)
      .gte('occurred_on', start)
      .lt('occurred_on', end)
      .order('occurred_on', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  /** Income in an arbitrary [start, end) range, e.g. for a year or custom statistics period. */
  async getIncomeInRange(familyId: string, start: Date, end: Date) {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('family_id', familyId)
      .gte('occurred_on', start.toISOString().slice(0, 10))
      .lt('occurred_on', end.toISOString().slice(0, 10))
      .order('occurred_on', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async addIncome(input: Inserts<'income'>) {
    const { data, error } = await supabase.from('income').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteIncome(id: string) {
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (error) throw error
  },

  async getRecurringExpenses(familyId: string) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*, category:expense_categories(*)')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('next_due_date')
    if (error) throw error
    return data ?? []
  },

  async addRecurringExpense(input: Inserts<'recurring_expenses'>) {
    const { data, error } = await supabase.from('recurring_expenses').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteRecurringExpense(id: string) {
    const { error } = await supabase.from('recurring_expenses').update({ is_active: false }).eq('id', id)
    if (error) throw error
  },

  async getRecurringIncome(familyId: string) {
    const { data, error } = await supabase
      .from('recurring_income')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('next_due_date')
    if (error) throw error
    return data ?? []
  },

  async addRecurringIncome(input: Inserts<'recurring_income'>) {
    const { data, error } = await supabase.from('recurring_income').insert(input).select().single()
    if (error) throw error
    return data
  },

  async deleteRecurringIncome(id: string) {
    const { error } = await supabase.from('recurring_income').update({ is_active: false }).eq('id', id)
    if (error) throw error
  },

  async getOrCreateBudget(familyId: string, month: Date) {
    const monthDate = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10)
    const { data: existing, error: selectError } = await supabase
      .from('budgets')
      .select('*, budget_categories(*, category:expense_categories(*))')
      .eq('family_id', familyId)
      .eq('month', monthDate)
      .maybeSingle()
    if (selectError) throw selectError
    if (existing) return existing

    const { data: created, error: insertError } = await supabase
      .from('budgets')
      .insert({ family_id: familyId, month: monthDate })
      .select('*, budget_categories(*, category:expense_categories(*))')
      .single()
    if (insertError) throw insertError
    return created
  },

  async setBudgetCategoryAmount(budgetId: string, categoryId: string, amountCents: number) {
    const { data, error } = await supabase
      .from('budget_categories')
      .upsert({ budget_id: budgetId, category_id: categoryId, amount_cents: amountCents }, { onConflict: 'budget_id,category_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
