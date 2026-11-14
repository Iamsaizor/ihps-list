-- Run once in Supabase SQL Editor before deploying the updated app.
alter table public.levels
  add column if not exists tentative boolean not null default false;

-- Only users authorized to manage the level's list may change this flag.
create or replace function public.admin_set_level_tentative(
  target_level_id uuid,
  chosen_tentative boolean
) returns void
language plpgsql security definer
set search_path = public
as $$
declare target_list_id uuid;
begin
  select list_id into target_list_id
  from public.levels where id = target_level_id;

  if target_list_id is null then
    raise exception 'Level not found';
  end if;

  if not coalesce(public.can_manage_list(target_list_id), false) then
    raise exception 'Not authorized to manage this list';
  end if;

  update public.levels
  set tentative = coalesce(chosen_tentative, false)
  where id = target_level_id;
end;
$$;

revoke all on function public.admin_set_level_tentative(uuid, boolean) from public;
grant execute on function public.admin_set_level_tentative(uuid, boolean) to authenticated;
