-- Storage buckets and policies.
-- Convention: object paths start with the family_id (or user_id for avatars),
-- e.g. documents/<family_id>/<document_id>.pdf, avatars/<user_id>/photo.jpg
-- This lets policies check membership purely from the path, without a join.

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('receipts', 'receipts', false),
  ('recipe-images', 'recipe-images', false),
  ('family-images', 'family-images', false)
on conflict (id) do nothing;

-- avatars: publicly readable, owner-writable ---------------------------------
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- family-images: readable/writable by family members --------------------------
create policy "family_images_member_read" on storage.objects
  for select using (
    bucket_id = 'family-images' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "family_images_manager_write" on storage.objects
  for insert with check (
    bucket_id = 'family-images' and public.is_family_manager(((storage.foldername(name))[1])::uuid)
  );

-- documents/receipts/recipe-images: family-scoped, private-aware -------------
create policy "documents_member_read" on storage.objects
  for select using (
    bucket_id = 'documents' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_member_write" on storage.objects
  for insert with check (
    bucket_id = 'documents' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_member_read" on storage.objects
  for select using (
    bucket_id = 'receipts' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts_member_write" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "recipe_images_member_read" on storage.objects
  for select using (
    bucket_id = 'recipe-images' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );

create policy "recipe_images_member_write" on storage.objects
  for insert with check (
    bucket_id = 'recipe-images' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
