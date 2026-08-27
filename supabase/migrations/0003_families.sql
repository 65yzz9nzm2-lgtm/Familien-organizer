-- Families, membership, and invitations.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  image_url text,
  color text default '#6366f1',
  country text default 'DE',
  currency text not null default 'EUR',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null default 'member',
  display_name text,
  color text default '#6366f1',
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create index family_members_user_id_idx on public.family_members (user_id);
create index family_members_family_id_idx on public.family_members (family_id);

-- RLS helper functions -----------------------------------------------------
-- These are SECURITY DEFINER so they can look up membership without being
-- blocked by the RLS they are used to enforce, but they only ever return
-- booleans/ids derived from auth.uid() - never raw row data. They live here
-- (rather than in 0001) because Postgres validates a SQL-language function's
-- body against the catalog at CREATE FUNCTION time, so family_members must
-- already exist.

-- Is the current user a member of the given family? --------------------------
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
  );
$$;

-- Does the current user hold one of the given roles in the family? -----------
create or replace function public.has_family_role(target_family_id uuid, roles public.family_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role = any(roles)
  );
$$;

-- Convenience: admin or parent (the two roles allowed to manage shared data) --
create or replace function public.is_family_manager(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_family_role(target_family_id, array['admin', 'parent']::public.family_role[]);
$$;

create or replace function public.is_family_admin(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_family_role(target_family_id, array['admin']::public.family_role[]);
$$;

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null unique default public.generate_invite_code(),
  email text,
  invited_role public.family_role not null default 'member',
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index family_invitations_code_idx on public.family_invitations (code);
create index family_invitations_family_id_idx on public.family_invitations (family_id);

-- Now that family_members exists, allow reading profiles of shared-family members.
create policy "profiles_select_family_members" on public.profiles
  for select using (
    exists (
      select 1 from public.family_members mine
      join public.family_members theirs on theirs.family_id = mine.family_id
      where mine.user_id = auth.uid() and theirs.user_id = public.profiles.id
    )
  );

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;

-- families --------------------------------------------------------------
create policy "families_select_member" on public.families
  for select using (public.is_family_member(id));

-- Anyone authenticated may create a family; they become its first member via
-- the application logic (insert into family_members happens right after).
create policy "families_insert_authenticated" on public.families
  for insert with check (created_by = auth.uid());

create policy "families_update_admin" on public.families
  for update using (public.is_family_admin(id));

create policy "families_delete_admin" on public.families
  for delete using (public.is_family_admin(id));

-- family_members ----------------------------------------------------------
create policy "family_members_select_same_family" on public.family_members
  for select using (public.is_family_member(family_id));

-- A user may add themselves (creating a family, or accepting an invite via a
-- security-definer RPC - see 0003b). Admins may add/manage other members.
create policy "family_members_insert_self_or_admin" on public.family_members
  for insert with check (user_id = auth.uid() or public.is_family_admin(family_id));

create policy "family_members_update_admin_or_self" on public.family_members
  for update using (public.is_family_admin(family_id) or user_id = auth.uid());

create policy "family_members_delete_admin_or_self" on public.family_members
  for delete using (public.is_family_admin(family_id) or user_id = auth.uid());

-- family_invitations --------------------------------------------------------
create policy "family_invitations_select_manager" on public.family_invitations
  for select using (public.is_family_manager(family_id));

create policy "family_invitations_insert_manager" on public.family_invitations
  for insert with check (public.is_family_manager(family_id) and created_by = auth.uid());

create policy "family_invitations_delete_manager" on public.family_invitations
  for delete using (public.is_family_manager(family_id));

-- Accepting an invitation is done through a SECURITY DEFINER RPC (below) so a
-- user who is not yet a member can look up a single invite by its code
-- without being able to browse all invitations for a family they don't belong to.
create or replace function public.accept_family_invitation(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.family_invitations;
  new_member_id uuid;
begin
  select * into invite
  from public.family_invitations
  where code = upper(invite_code)
    and accepted_at is null
    and expires_at > now();

  if invite is null then
    raise exception 'invite_invalid_or_expired';
  end if;

  if exists (
    select 1 from public.family_members
    where family_id = invite.family_id and user_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invite.family_id, auth.uid(), invite.invited_role)
  returning id into new_member_id;

  update public.family_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return invite.family_id;
end;
$$;
