-- family_members.display_name was never populated when a family was created
-- or an invitation accepted, so the app fell back to showing the literal
-- placeholder "Mitglied" for every member everywhere. Both paths now default
-- it from the user's profile (full name, or the local part of their email if
-- they never set one) at the moment they join - the user can still rename
-- themselves afterwards via the app.

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
  my_display_name text;
begin
  select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1))
  into my_display_name
  from public.profiles
  where id = auth.uid();

  insert into public.families (name, color, country, currency, image_url, created_by)
  values (p_name, p_color, p_country, p_currency, p_image_url, auth.uid())
  returning * into new_family;

  insert into public.family_members (family_id, user_id, role, display_name)
  values (new_family.id, auth.uid(), 'admin', my_display_name);

  return new_family;
end;
$$;

create or replace function public.accept_family_invitation(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.family_invitations;
  new_member_id uuid;
  my_display_name text;
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

  select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1))
  into my_display_name
  from public.profiles
  where id = auth.uid();

  insert into public.family_members (family_id, user_id, role, display_name)
  values (invite.family_id, auth.uid(), invite.invited_role, my_display_name)
  returning id into new_member_id;

  update public.family_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return invite.family_id;
end;
$$;

-- Backfill members who joined before this fix and are still stuck on "Mitglied".
update public.family_members fm
set display_name = coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1))
from public.profiles p
where fm.user_id = p.id
  and fm.display_name is null;
