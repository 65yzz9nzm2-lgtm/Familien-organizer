-- Savings goals, birthdays, documents.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  target_amount_cents bigint not null check (target_amount_cents > 0),
  target_date date,
  image_url text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_transactions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount_cents bigint not null check (amount_cents <> 0), -- negative = withdrawal
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index goal_transactions_goal_id_idx on public.goal_transactions (goal_id);

create table public.birthdays (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  gift_ideas text,
  budget_cents bigint check (budget_cents >= 0),
  gift_purchased boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger birthdays_set_updated_at
  before update on public.birthdays
  for each row execute function public.set_updated_at();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  category text not null default 'Sonstiges',
  storage_path text not null, -- path within the 'documents' storage bucket
  expires_at date,
  remind_before_days integer default 30,
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles (id),
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index documents_family_id_idx on public.documents (family_id);

-- RLS ---------------------------------------------------------------------
alter table public.goals enable row level security;
alter table public.goal_transactions enable row level security;
alter table public.birthdays enable row level security;
alter table public.documents enable row level security;

create policy "goals_all_members" on public.goals
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "goal_transactions_select" on public.goal_transactions
  for select using (
    exists (select 1 from public.goals g where g.id = goal_id and public.is_family_member(g.family_id))
  );

create policy "goal_transactions_insert" on public.goal_transactions
  for insert with check (
    exists (select 1 from public.goals g where g.id = goal_id and public.is_family_member(g.family_id))
  );

create policy "birthdays_all_members" on public.birthdays
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "documents_select" on public.documents
  for select using (
    public.is_family_member(family_id) and (not is_private or owner_id = auth.uid())
  );

create policy "documents_insert" on public.documents
  for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());

create policy "documents_update" on public.documents
  for update using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "documents_delete" on public.documents
  for delete using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));
