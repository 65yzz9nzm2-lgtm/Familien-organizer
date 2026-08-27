-- Tasks, assignments, and the kids' points/rewards system.

create type public.task_priority as enum ('low', 'medium', 'high');
create type public.task_status as enum ('open', 'done');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  recurrence_rule text, -- e.g. 'weekly:wed'
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'open',
  points integer not null default 0 check (points >= 0),
  category text default 'Haushalt',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_family_id_idx on public.tasks (family_id, status);

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  points_cost integer not null check (points_cost > 0),
  icon text default 'Gift',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Ledger of point events: positive = earned (task completed), negative = redeemed (reward claimed).
create table public.reward_points (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  points integer not null,
  reason text not null,
  task_id uuid references public.tasks (id) on delete set null,
  reward_id uuid references public.rewards (id) on delete set null,
  created_at timestamptz not null default now()
);

create index reward_points_user_id_idx on public.reward_points (family_id, user_id);

-- RLS ---------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_points enable row level security;

create policy "tasks_all_members" on public.tasks
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "task_assignments_select" on public.task_assignments
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_family_member(t.family_id))
  );

create policy "task_assignments_write" on public.task_assignments
  for all using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_family_member(t.family_id))
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_family_member(t.family_id))
  );

create policy "rewards_all_members" on public.rewards
  for all using (public.is_family_member(family_id)) with check (public.is_family_manager(family_id));

create policy "rewards_select_members" on public.rewards
  for select using (public.is_family_member(family_id));

create policy "reward_points_select" on public.reward_points
  for select using (public.is_family_member(family_id));

create policy "reward_points_insert" on public.reward_points
  for insert with check (public.is_family_member(family_id));
