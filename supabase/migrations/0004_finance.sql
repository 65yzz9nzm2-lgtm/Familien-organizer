-- Finance: categories, expenses, income, recurring costs, budgets.
-- All money columns are bigint "cents" (minor currency units) to avoid
-- floating point rounding errors.

create type public.recurrence_interval as enum (
  'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual', 'custom'
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families (id) on delete cascade, -- null = built-in default category
  name text not null,
  icon text not null default 'Tag',
  color text not null default '#6366f1',
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  created_at timestamptz not null default now(),
  unique (family_id, name, kind)
);

create index expense_categories_family_id_idx on public.expense_categories (family_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR',
  occurred_on date not null default current_date,
  paid_by uuid references public.profiles (id),
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles (id),
  note text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create index expenses_family_id_idx on public.expenses (family_id, occurred_on desc);
create index expenses_category_id_idx on public.expenses (category_id);

create table public.income (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  source_type text not null default 'salary' check (source_type in ('salary', 'child_benefit', 'bonus', 'side_job', 'refund', 'other')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR',
  occurred_on date not null default current_date,
  received_by uuid references public.profiles (id),
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger income_set_updated_at
  before update on public.income
  for each row execute function public.set_updated_at();

create index income_family_id_idx on public.income (family_id, occurred_on desc);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR',
  interval public.recurrence_interval not null default 'monthly',
  custom_interval_months integer check (
    (interval = 'custom' and custom_interval_months > 0) or
    (interval <> 'custom' and custom_interval_months is null)
  ),
  next_due_date date not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recurring_expenses_set_updated_at
  before update on public.recurring_expenses
  for each row execute function public.set_updated_at();

create index recurring_expenses_family_id_idx on public.recurring_expenses (family_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  month date not null, -- always the 1st of the month
  created_at timestamptz not null default now(),
  unique (family_id, month)
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  category_id uuid not null references public.expense_categories (id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  unique (budget_id, category_id)
);

-- RLS --------------------------------------------------------------------
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.income enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;

create policy "categories_select" on public.expense_categories
  for select using (family_id is null or public.is_family_member(family_id));

create policy "categories_insert_member" on public.expense_categories
  for insert with check (family_id is not null and public.is_family_member(family_id));

create policy "categories_update_member" on public.expense_categories
  for update using (family_id is not null and public.is_family_member(family_id));

create policy "categories_delete_member" on public.expense_categories
  for delete using (family_id is not null and public.is_family_member(family_id));

-- Expenses/income: visible to family members, but a row marked private is
-- only visible to its owner even within the same family.
create policy "expenses_select" on public.expenses
  for select using (
    public.is_family_member(family_id) and (not is_private or owner_id = auth.uid())
  );

create policy "expenses_insert" on public.expenses
  for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());

create policy "expenses_update" on public.expenses
  for update using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "expenses_delete" on public.expenses
  for delete using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "income_select" on public.income
  for select using (
    public.is_family_member(family_id) and (not is_private or owner_id = auth.uid())
  );

create policy "income_insert" on public.income
  for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());

create policy "income_update" on public.income
  for update using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "income_delete" on public.income
  for delete using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "recurring_expenses_select" on public.recurring_expenses
  for select using (public.is_family_member(family_id));

create policy "recurring_expenses_write" on public.recurring_expenses
  for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy "budgets_select" on public.budgets
  for select using (public.is_family_member(family_id));

create policy "budgets_write" on public.budgets
  for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

create policy "budget_categories_select" on public.budget_categories
  for select using (
    exists (select 1 from public.budgets b where b.id = budget_id and public.is_family_member(b.family_id))
  );

create policy "budget_categories_write" on public.budget_categories
  for all using (
    exists (select 1 from public.budgets b where b.id = budget_id and public.is_family_manager(b.family_id))
  ) with check (
    exists (select 1 from public.budgets b where b.id = budget_id and public.is_family_manager(b.family_id))
  );

-- Seed a set of sensible default categories (family_id = null, visible to everyone).
insert into public.expense_categories (family_id, name, icon, color, kind) values
  (null, 'Wohnen', 'Home', '#6366f1', 'expense'),
  (null, 'Lebensmittel', 'ShoppingCart', '#22c55e', 'expense'),
  (null, 'Auto', 'Car', '#0ea5e9', 'expense'),
  (null, 'Tanken', 'Fuel', '#f97316', 'expense'),
  (null, 'Strom', 'Zap', '#eab308', 'expense'),
  (null, 'Internet', 'Wifi', '#06b6d4', 'expense'),
  (null, 'Telefon', 'Phone', '#8b5cf6', 'expense'),
  (null, 'Freizeit', 'PartyPopper', '#ec4899', 'expense'),
  (null, 'Kleidung', 'Shirt', '#f43f5e', 'expense'),
  (null, 'Gesundheit', 'HeartPulse', '#ef4444', 'expense'),
  (null, 'Schule', 'GraduationCap', '#3b82f6', 'expense'),
  (null, 'Haustiere', 'PawPrint', '#a855f7', 'expense'),
  (null, 'Restaurant', 'UtensilsCrossed', '#fb923c', 'expense'),
  (null, 'Urlaub', 'Plane', '#14b8a6', 'expense'),
  (null, 'Geschenke', 'Gift', '#f472b6', 'expense'),
  (null, 'Sonstiges', 'MoreHorizontal', '#64748b', 'expense');
