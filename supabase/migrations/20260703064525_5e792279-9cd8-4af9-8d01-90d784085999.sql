-- atlas-uploads: owner-scoped by first folder = user id
create policy "atlas uploads: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'atlas-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_reviewer(auth.uid())));
create policy "atlas uploads: owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'atlas-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "atlas uploads: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'atlas-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'atlas-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "atlas uploads: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'atlas-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_reviewer(auth.uid())));

-- acervo: authenticated can read, only reviewers manage
create policy "acervo: authenticated read" on storage.objects for select to authenticated
  using (bucket_id = 'acervo');
create policy "acervo: reviewers insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acervo' and public.is_reviewer(auth.uid()));
create policy "acervo: reviewers update" on storage.objects for update to authenticated
  using (bucket_id = 'acervo' and public.is_reviewer(auth.uid()))
  with check (bucket_id = 'acervo' and public.is_reviewer(auth.uid()));
create policy "acervo: reviewers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'acervo' and public.is_reviewer(auth.uid()));