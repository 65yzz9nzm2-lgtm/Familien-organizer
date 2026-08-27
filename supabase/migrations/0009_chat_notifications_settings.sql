-- Family chat, notifications, and per-user/per-family settings.

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  content text not null check (char_length(trim(content)) > 0),
  created_task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index chat_messages_family_id_idx on public.chat_messages (family_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid references public.families (id) on delete cascade,
  type text not null, -- e.g. 'task_due', 'birthday', 'bill_due', 'chat_message', 'invitation'
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  locale text not null default 'de-DE',
  currency text not null default 'EUR',
  notification_prefs jsonb not null default '{
    "tasks": true, "calendar": true, "birthdays": true, "bills": true, "chat": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create table public.family_settings (
  family_id uuid primary key references public.families (id) on delete cascade,
  currency text not null default 'EUR',
  locale text not null default 'de-DE',
  country text not null default 'DE',
  notification_defaults jsonb not null default '{
    "tasks": true, "calendar": true, "birthdays": true, "bills": true, "chat": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger family_settings_set_updated_at
  before update on public.family_settings
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------------------
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.family_settings enable row level security;

create policy "chat_messages_select" on public.chat_messages
  for select using (public.is_family_member(family_id));

create policy "chat_messages_insert" on public.chat_messages
  for insert with check (public.is_family_member(family_id) and user_id = auth.uid());

create policy "chat_messages_delete_own_or_manager" on public.chat_messages
  for delete using (user_id = auth.uid() or public.is_family_manager(family_id));

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_delete_own" on public.notifications
  for delete using (user_id = auth.uid());

-- Notifications are created by backend logic (triggers/edge functions) running
-- as the recipient or via service role; allow a user to also create their own.
create policy "notifications_insert_own" on public.notifications
  for insert with check (user_id = auth.uid());

create policy "user_settings_own" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "family_settings_select" on public.family_settings
  for select using (public.is_family_member(family_id));

create policy "family_settings_write" on public.family_settings
  for all using (public.is_family_manager(family_id)) with check (public.is_family_manager(family_id));

-- Auto-create default settings rows -----------------------------------------
create or replace function public.handle_new_profile_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute function public.handle_new_profile_settings();

create or replace function public.handle_new_family_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_settings (family_id, currency, country)
  values (new.id, new.currency, new.country)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_family_created_settings
  after insert on public.families
  for each row execute function public.handle_new_family_settings();
