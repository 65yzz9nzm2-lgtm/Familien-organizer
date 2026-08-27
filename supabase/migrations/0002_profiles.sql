-- Profiles: one row per auth user, auto-created on signup.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Users can read their own profile. The additional policy allowing a user to
-- read the profiles of their family members is added in 0003_families.sql,
-- once the family_members table this policy depends on exists.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up (Google or email).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
