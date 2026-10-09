create or replace function public.get_valid_homologation_photo_ids(p_card_ids uuid[] default null)
returns table(photo_id uuid, homologation_card_id uuid)
language sql stable security definer set search_path = public, storage
as $$
  select p.id, p.homologation_card_id
  from public.homologation_photos p
  join storage.objects o on o.bucket_id = 'homologation-photos' and o.name = p.file_path
  where coalesce((o.metadata->>'size')::int, 0) >= 20000
    and (p_card_ids is null or p.homologation_card_id = any(p_card_ids));
$$;
revoke all on function public.get_valid_homologation_photo_ids(uuid[]) from public, anon;
grant execute on function public.get_valid_homologation_photo_ids(uuid[]) to authenticated, service_role;