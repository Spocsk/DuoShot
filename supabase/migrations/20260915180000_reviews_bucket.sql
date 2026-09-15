-- Review client JPEGs: private bucket, same 24h retention as uploads/exports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', false, 104857600, array['image/jpeg']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.cleanup_expired_storage()
returns integer
language plpgsql
security definer
set search_path = storage
as $$
declare
  deleted_count integer;
begin
  delete from storage.objects
  where bucket_id in ('uploads', 'exports', 'reviews')
    and created_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
