-- Creating a family used to be two client-side inserts (families, then
-- family_members). That has an RLS gap: Postgres enforces the SELECT policy
-- on rows returned by "INSERT ... RETURNING" (what .insert().select() does),
-- and at the moment the family is inserted the creator isn't a member of it
-- yet - so families_select_member's is_family_member(id) check fails and the
-- insert itself errors with "new row violates row-level security policy",
-- even though the insert would otherwise have been allowed.
--
-- Fix: do both inserts atomically in one SECURITY DEFINER function, so the
-- admin membership row exists before anything tries to read the family back.
-- This grants no capability beyond what RLS already allowed a user to do to
-- their own rows (families_insert_authenticated, family_members_insert_self_or_admin) -
-- it just removes the timing gap. Same pattern as accept_family_invitation.
create or replace function public.create_family_with_admin(
  p_name text,
  p_color text default '#6366f1',
  p_country text default 'DE',
  p_currency text default 'EUR',
  p_image_url text default null
)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
begin
  insert into public.families (name, color, country, currency, image_url, created_by)
  values (p_name, p_color, p_country, p_currency, p_image_url, auth.uid())
  returning * into new_family;

  insert into public.family_members (family_id, user_id, role)
  values (new_family.id, auth.uid(), 'admin');

  return new_family;
end;
$$;
