-- recipe-images had read+insert policies (0010_storage.sql) but no delete
-- policy, so a deleted recipe (or a replaced photo) could never have its
-- image object removed from storage.

create policy "recipe_images_member_delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-images' and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
