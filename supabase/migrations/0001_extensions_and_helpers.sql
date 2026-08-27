-- FamilyHub: extensions and generic helpers.
-- The family-membership RLS helper functions (is_family_member, etc.) live in
-- 0003_families.sql instead of here, because they query public.family_members
-- - Postgres validates a SQL-language function's body against the catalog at
-- CREATE FUNCTION time, so they can only be defined once that table exists.

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

-- Random, URL-safe invitation code (10 uppercase hex chars) ------------------
create or replace function public.generate_invite_code()
returns text
language sql
volatile
as $$
  select upper(encode(gen_random_bytes(5), 'hex'))
$$;
