// Hand-written to mirror supabase/migrations/*.sql.
// Once a real Supabase project is linked, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type FamilyRole = 'admin' | 'parent' | 'member' | 'child'
export type RecurrenceInterval = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom'
export type CalendarEventType =
  | 'family' | 'private' | 'school' | 'sport' | 'doctor' | 'work' | 'birthday' | 'vacation' | 'payment' | 'shopping' | 'meal'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'open' | 'done'
export type IncomeSourceType = 'salary' | 'child_benefit' | 'bonus' | 'side_job' | 'refund' | 'other'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          locale: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      families: {
        Row: {
          id: string
          name: string
          image_url: string | null
          color: string | null
          country: string | null
          currency: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['families']['Row']> & { name: string; created_by: string }
        Update: Partial<Database['public']['Tables']['families']['Row']>
        Relationships: []
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: FamilyRole
          display_name: string | null
          color: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['family_members']['Row']> & { family_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['family_members']['Row']>
        Relationships: []
      }
      family_invitations: {
        Row: {
          id: string
          family_id: string
          code: string
          email: string | null
          invited_role: FamilyRole
          created_by: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['family_invitations']['Row']> & { family_id: string; created_by: string }
        Update: Partial<Database['public']['Tables']['family_invitations']['Row']>
        Relationships: []
      }
      expense_categories: {
        Row: {
          id: string
          family_id: string | null
          name: string
          icon: string
          color: string
          kind: 'expense' | 'income'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['expense_categories']['Row']> & { name: string }
        Update: Partial<Database['public']['Tables']['expense_categories']['Row']>
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          family_id: string
          category_id: string | null
          amount_cents: number
          currency: string
          occurred_on: string
          paid_by: string | null
          is_private: boolean
          owner_id: string
          note: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & { family_id: string; amount_cents: number; owner_id: string }
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
        Relationships: [{ foreignKeyName: 'expenses_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'expense_categories'; referencedColumns: ['id'] }]
      }
      income: {
        Row: {
          id: string
          family_id: string
          source_type: IncomeSourceType
          amount_cents: number
          currency: string
          occurred_on: string
          received_by: string | null
          is_private: boolean
          owner_id: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['income']['Row']> & { family_id: string; amount_cents: number; owner_id: string }
        Update: Partial<Database['public']['Tables']['income']['Row']>
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          id: string
          family_id: string
          category_id: string | null
          name: string
          amount_cents: number
          currency: string
          interval: RecurrenceInterval
          custom_interval_months: number | null
          next_due_date: string
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['recurring_expenses']['Row']> & {
          family_id: string
          name: string
          amount_cents: number
          next_due_date: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['recurring_expenses']['Row']>
        Relationships: [{ foreignKeyName: 'recurring_expenses_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'expense_categories'; referencedColumns: ['id'] }]
      }
      budgets: {
        Row: { id: string; family_id: string; month: string; created_at: string }
        Insert: Partial<Database['public']['Tables']['budgets']['Row']> & { family_id: string; month: string }
        Update: Partial<Database['public']['Tables']['budgets']['Row']>
        Relationships: []
      }
      budget_categories: {
        Row: { id: string; budget_id: string; category_id: string; amount_cents: number }
        Insert: Partial<Database['public']['Tables']['budget_categories']['Row']> & {
          budget_id: string
          category_id: string
          amount_cents: number
        }
        Update: Partial<Database['public']['Tables']['budget_categories']['Row']>
        Relationships: [{ foreignKeyName: 'budget_categories_budget_id_fkey'; columns: ['budget_id']; isOneToOne: false; referencedRelation: 'budgets'; referencedColumns: ['id'] }, { foreignKeyName: 'budget_categories_category_id_fkey'; columns: ['category_id']; isOneToOne: false; referencedRelation: 'expense_categories'; referencedColumns: ['id'] }]
      }
      calendar_events: {
        Row: {
          id: string
          family_id: string
          title: string
          description: string | null
          event_type: CalendarEventType
          start_at: string
          end_at: string
          all_day: boolean
          location: string | null
          is_private: boolean
          owner_id: string
          recurrence_rule: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['calendar_events']['Row']> & {
          family_id: string
          title: string
          start_at: string
          end_at: string
          owner_id: string
          created_by: string
        }
        Update: Partial<Database['public']['Tables']['calendar_events']['Row']>
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          family_id: string
          name: string
          image_url: string | null
          ingredients: { name: string; quantity: number; unit: string }[]
          instructions: string | null
          prep_minutes: number | null
          servings: number
          category: string | null
          is_favorite: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['recipes']['Row']> & { family_id: string; name: string; created_by: string }
        Update: Partial<Database['public']['Tables']['recipes']['Row']>
        Relationships: []
      }
      meals: {
        Row: {
          id: string
          family_id: string
          recipe_id: string | null
          custom_title: string | null
          planned_on: string
          meal_type: MealType
          servings: number | null
          created_by: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['meals']['Row']> & { family_id: string; planned_on: string; created_by: string }
        Update: Partial<Database['public']['Tables']['meals']['Row']>
        Relationships: [{ foreignKeyName: 'meals_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }]
      }
      shopping_lists: {
        Row: { id: string; family_id: string; name: string; created_by: string; created_at: string }
        Insert: Partial<Database['public']['Tables']['shopping_lists']['Row']> & { family_id: string; created_by: string }
        Update: Partial<Database['public']['Tables']['shopping_lists']['Row']>
        Relationships: []
      }
      shopping_items: {
        Row: {
          id: string
          list_id: string
          name: string
          quantity: number | null
          unit: string | null
          category: string
          is_checked: boolean
          source: 'manual' | 'recipe'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['shopping_items']['Row']> & { list_id: string; name: string }
        Update: Partial<Database['public']['Tables']['shopping_items']['Row']>
        Relationships: [{ foreignKeyName: 'shopping_items_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'shopping_lists'; referencedColumns: ['id'] }]
      }
      pantry_items: {
        Row: { id: string; family_id: string; name: string; quantity: number; unit: string; category: string; updated_at: string }
        Insert: Partial<Database['public']['Tables']['pantry_items']['Row']> & { family_id: string; name: string }
        Update: Partial<Database['public']['Tables']['pantry_items']['Row']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          family_id: string
          title: string
          description: string | null
          due_date: string | null
          recurrence_rule: string | null
          priority: TaskPriority
          status: TaskStatus
          points: number
          category: string | null
          created_by: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['tasks']['Row']> & { family_id: string; title: string; created_by: string }
        Update: Partial<Database['public']['Tables']['tasks']['Row']>
        Relationships: []
      }
      task_assignments: {
        Row: { id: string; task_id: string; user_id: string; assigned_at: string }
        Insert: Partial<Database['public']['Tables']['task_assignments']['Row']> & { task_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['task_assignments']['Row']>
        Relationships: [{ foreignKeyName: 'task_assignments_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] }]
      }
      rewards: {
        Row: { id: string; family_id: string; title: string; points_cost: number; icon: string | null; created_by: string; created_at: string }
        Insert: Partial<Database['public']['Tables']['rewards']['Row']> & { family_id: string; title: string; points_cost: number; created_by: string }
        Update: Partial<Database['public']['Tables']['rewards']['Row']>
        Relationships: []
      }
      reward_points: {
        Row: {
          id: string
          family_id: string
          user_id: string
          points: number
          reason: string
          task_id: string | null
          reward_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['reward_points']['Row']> & {
          family_id: string
          user_id: string
          points: number
          reason: string
        }
        Update: Partial<Database['public']['Tables']['reward_points']['Row']>
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          family_id: string
          title: string
          target_amount_cents: number
          target_date: string | null
          image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['goals']['Row']> & { family_id: string; title: string; target_amount_cents: number; created_by: string }
        Update: Partial<Database['public']['Tables']['goals']['Row']>
        Relationships: []
      }
      goal_transactions: {
        Row: { id: string; goal_id: string; amount_cents: number; note: string | null; created_by: string; created_at: string }
        Insert: Partial<Database['public']['Tables']['goal_transactions']['Row']> & { goal_id: string; amount_cents: number; created_by: string }
        Update: Partial<Database['public']['Tables']['goal_transactions']['Row']>
        Relationships: [{ foreignKeyName: 'goal_transactions_goal_id_fkey'; columns: ['goal_id']; isOneToOne: false; referencedRelation: 'goals'; referencedColumns: ['id'] }]
      }
      birthdays: {
        Row: {
          id: string
          family_id: string
          name: string
          date_of_birth: string
          gift_ideas: string | null
          budget_cents: number | null
          gift_purchased: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['birthdays']['Row']> & { family_id: string; name: string; date_of_birth: string; created_by: string }
        Update: Partial<Database['public']['Tables']['birthdays']['Row']>
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          family_id: string
          name: string
          category: string
          storage_path: string
          expires_at: string | null
          remind_before_days: number | null
          is_private: boolean
          owner_id: string
          uploaded_by: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['documents']['Row']> & {
          family_id: string
          name: string
          storage_path: string
          owner_id: string
          uploaded_by: string
        }
        Update: Partial<Database['public']['Tables']['documents']['Row']>
        Relationships: []
      }
      chat_messages: {
        Row: { id: string; family_id: string; user_id: string; content: string; created_task_id: string | null; created_at: string }
        Insert: Partial<Database['public']['Tables']['chat_messages']['Row']> & { family_id: string; user_id: string; content: string }
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>
        Relationships: [{ foreignKeyName: 'chat_messages_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          family_id: string | null
          type: string
          title: string
          body: string | null
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & { user_id: string; type: string; title: string }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          theme: 'light' | 'dark' | 'system'
          locale: string
          currency: string
          notification_prefs: Record<string, boolean>
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_settings']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['user_settings']['Row']>
        Relationships: []
      }
      family_settings: {
        Row: {
          family_id: string
          currency: string
          locale: string
          country: string
          notification_defaults: Record<string, boolean>
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['family_settings']['Row']> & { family_id: string }
        Update: Partial<Database['public']['Tables']['family_settings']['Row']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_family_invitation: {
        Args: { invite_code: string }
        Returns: string
      }
      generate_invite_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
