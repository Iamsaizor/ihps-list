begin;

alter table public.levels
  add column if not exists required_tps text,
  add column if not exists required_fps text,
  add column if not exists average_cps text,
  add column if not exists technical_notes text;

create or replace function public.admin_set_ill_technical(target_level_id uuid, chosen_technical jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare target_list_id uuid;
begin
  select l.list_id into target_list_id from public.levels l
  join public.lists li on li.id = l.list_id
  where l.id = target_level_id and li.slug = 'impossible';
  if target_list_id is null or not coalesce(public.can_manage_list(target_list_id), false) then
    raise exception 'Not authorized to manage this ILL level';
  end if;
  if chosen_technical is null or jsonb_typeof(chosen_technical) <> 'object' then
    raise exception 'Invalid technical data';
  end if;
  if exists (select 1 from jsonb_each_text(chosen_technical) as j(k,v)
    where length(v) > case when k = 'technical_notes' then 2000 else 120 end) then
    raise exception 'Technical field exceeds maximum length';
  end if;
  update public.levels set
    required_tps = nullif(btrim(chosen_technical->>'required_tps'), ''),
    required_fps = nullif(btrim(chosen_technical->>'required_fps'), ''),
    average_cps = nullif(btrim(chosen_technical->>'average_cps'), ''),
    technical_notes = nullif(btrim(chosen_technical->>'technical_notes'), '')
  where id = target_level_id;
end;
$$;
revoke all on function public.admin_set_ill_technical(uuid, jsonb) from public;
grant execute on function public.admin_set_ill_technical(uuid, jsonb) to authenticated;
commit;
