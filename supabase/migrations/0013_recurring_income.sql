-- Fixed/recurring income (e.g. a monthly salary), mirroring recurring_expenses
-- (Fixkosten) but with the private/owner model of the one-off income table,
-- since income is more often personal than a shared household bill.

create table public.recurring_income (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  source_type text not null default 'salary' check (source_type in ('salary', 'child_benefit', 'bonus', 'side_job', 'refund', 'other')),
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR',
  interval public.recurrence_interval not null default 'monthly',
  custom_interval_months integer check (
    (interval = 'custom' and custom_interval_months > 0) or
    (interval <> 'custom' and custom_interval_months is null)
  ),
  next_due_date date not null,
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles (id),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recurring_income_set_updated_at
  before update on public.recurring_income
  for each row execute function public.set_updated_at();

create index recurring_income_family_id_idx on public.recurring_income (family_id);

alter table public.recurring_income enable row level security;

create policy "recurring_income_select" on public.recurring_income
  for select using (
    public.is_family_member(family_id) and (not is_private or owner_id = auth.uid())
  );

create policy "recurring_income_insert" on public.recurring_income
  for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());

create policy "recurring_income_update" on public.recurring_income
  for update using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "recurring_income_delete" on public.recurring_income
  for delete using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));
