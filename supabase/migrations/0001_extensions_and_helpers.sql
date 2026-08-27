-- FamilyHub: extensions, generic helpers, and RLS helper functions
-- These helper functions are SECURITY DEFINER so they can look up membership
-- without being blocked by the RLS they are used to enforce, but they only
-- ever return booleans/ids derived from auth.uid() - never raw row data.

create extension if not exists "pgcrypto";

-- Generic updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role hierarchy used across policies ----------------------------------------
-- admin > parent > member > child
create type public.family_role as enum ('admin', 'parent', 'member', 'child');

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

-- Random, URL-safe invitation code (10 uppercase hex chars) ------------------
create or replace function public.generate_invite_code()
returns text
language sql
volatile
as $$
  select upper(encode(gen_random_bytes(5), 'hex'))
$$;
