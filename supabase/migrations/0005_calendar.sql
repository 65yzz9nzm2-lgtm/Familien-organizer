-- Calendar events with family/private visibility and simple recurrence.

create type public.calendar_event_type as enum (
  'family', 'private', 'school', 'sport', 'doctor', 'work', 'birthday', 'vacation', 'payment', 'shopping', 'meal'
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  event_type public.calendar_event_type not null default 'family',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  is_private boolean not null default false,
  owner_id uuid not null references public.profiles (id),
  recurrence_rule text, -- e.g. 'weekly', 'monthly', 'yearly'; null = one-off
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

create index calendar_events_family_id_idx on public.calendar_events (family_id, start_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select" on public.calendar_events
  for select using (
    public.is_family_member(family_id) and (not is_private or owner_id = auth.uid())
  );

create policy "calendar_events_insert" on public.calendar_events
  for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());

create policy "calendar_events_update" on public.calendar_events
  for update using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));

create policy "calendar_events_delete" on public.calendar_events
  for delete using (public.is_family_member(family_id) and (owner_id = auth.uid() or public.is_family_manager(family_id)));
