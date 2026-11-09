-- ihPS player tags. Run in Supabase SQL Editor after existing player/points SQL.
-- Existing users are included immediately by the live eligibility view.
create table if not exists public.ihps_tag_grants (
 user_id uuid not null references auth.users(id) on delete cascade,
 tag text not null,
 granted_at timestamptz not null default now(),
 primary key(user_id,tag)
);
create table if not exists public.ihps_tag_identity_links (
 user_id uuid not null references auth.users(id) on delete cascade,
 level_id uuid not null references public.levels(id) on delete cascade,
 role text not null check(role in ('creator','verifier')),
 primary key(user_id,level_id,role)
);
create table if not exists public.ihps_tag_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 equipped_tag text
);
create table if not exists public.ihps_tag_legacy (
 user_id uuid not null references auth.users(id) on delete cascade,
 tag text not null check(tag='Omni-Slayer'),
 earned_at timestamptz not null default now(),
 primary key(user_id,tag)
);
create table if not exists public.ihps_tag_staff_grants (
 user_id uuid not null references auth.users(id) on delete cascade,
 tag text not null check(tag in ('Founder','Administrator','Developer','List Manager','Demon List Mod','Challenge List Mod','Impossible List Mod','Future Demon List Mod')),
 primary key(user_id,tag)
);
-- IMPORTANT: Only administrators using SQL Editor/service-role may write grants/identity links.
alter table public.ihps_tag_grants enable row level security;
alter table public.ihps_tag_identity_links enable row level security;
alter table public.ihps_tag_preferences enable row level security;
alter table public.ihps_tag_legacy enable row level security;
alter table public.ihps_tag_staff_grants enable row level security;
revoke all on public.ihps_tag_grants,public.ihps_tag_identity_links,public.ihps_tag_legacy,public.ihps_tag_staff_grants from anon,authenticated;
grant select on public.ihps_tag_preferences to authenticated;
create policy "read own tag preferences" on public.ihps_tag_preferences for select to authenticated using(user_id=auth.uid());

-- All eligibility is calculated against CURRENT placements and accepted completions.
-- No stale cached unlocks; any moved level or revoked record immediately changes eligibility.
create or replace view public.ihps_tag_eligibility with (security_invoker = true) as
with ranked as (
 select user_id, username, overall_points, demon_points, challenge_points,
 row_number() over(order by overall_points desc,username asc) overall_rank,
 row_number() over(order by demon_points desc,username asc) demon_rank,
 row_number() over(order by challenge_points desc,username asc) challenge_rank
 from public.player_leaderboard_points
),
current_levels as (
 select l.id,l.position,lower(s.slug) slug from public.levels l join public.lists s on s.id=l.list_id
 where lower(s.slug) in ('demon','challenge','impossible','future-demon','future_demon')
),
completions as (
 select distinct r.user_id,r.level_id from public.record_submissions r
 where r.status='accepted' and r.percent=100
),
counts as (
 select p.user_id,
 (select count(*) from current_levels where slug='demon') demon_total,
 (select count(*) from current_levels where slug='challenge') challenge_total,
 (select count(*) from current_levels l join completions c on c.level_id=l.id where c.user_id=p.user_id and l.slug='demon') demon_done,
 (select count(*) from current_levels l join completions c on c.level_id=l.id where c.user_id=p.user_id and l.slug='challenge') challenge_done
 from public.player_profiles p
),
auto_tags as (
 select user_id,'Top 1 Player' tag from ranked where overall_rank=1 and overall_points>0
 union all select user_id,'Top 3 Player' from ranked where overall_rank<=3 and overall_points>0
 union all select user_id,'Top 5 Player' from ranked where overall_rank<=5 and overall_points>0
 union all select user_id,'Demon List Champion' from ranked where demon_rank=1 and demon_points>0
 union all select user_id,'Demon List Elite' from ranked where demon_rank<=3 and demon_points>0
 union all select user_id,'Demon List Veteran' from ranked where demon_rank<=10 and demon_points>0
 union all select user_id,'Challenge List Champion' from ranked where challenge_rank=1 and challenge_points>0
 union all select user_id,'Challenge List Elite' from ranked where challenge_rank<=3 and challenge_points>0
 union all select user_id,'Challenge List Veteran' from ranked where challenge_rank<=10 and challenge_points>0
 union all select user_id,'Dual Champion' from ranked where demon_rank=1 and challenge_rank=1 and demon_points>0 and challenge_points>0
 union all select user_id,'Dual Elite' from ranked where demon_rank<=3 and challenge_rank<=3 and demon_points>0 and challenge_points>0
 union all select c.user_id,'Top 1 Demon Victor' from completions c join current_levels l on l.id=c.level_id where l.slug='demon' and l.position=1
 union all select c.user_id,'Top 1 Challenge Victor' from completions c join current_levels l on l.id=c.level_id where l.slug='challenge' and l.position=1
 union all select user_id,'Exorcist' from counts where demon_total>0 and demon_done=demon_total
 union all select user_id,'Demon Obliterator' from counts where demon_total>0 and demon_done*4>=demon_total*3
 union all select user_id,'Demon Killer' from counts where demon_total>0 and demon_done*2>=demon_total
 union all select user_id,'Demon Hunter' from counts where demon_total>0 and demon_done*4>=demon_total
 union all select user_id,'Masochist' from counts where challenge_total>0 and challenge_done=challenge_total
 union all select user_id,'Challenge Obliterator' from counts where challenge_total>0 and challenge_done*4>=challenge_total*3
 union all select user_id,'Challenge Destroyer' from counts where challenge_total>0 and challenge_done*2>=challenge_total
 union all select user_id,'Challenge Killer' from counts where challenge_total>0 and challenge_done*4>=challenge_total
 union all select i.user_id,case when l.slug='demon' and i.role='creator' then 'Hellraiser' when l.slug='demon' and i.role='verifier' then 'Hellbringer' when l.slug='challenge' and i.role='creator' then 'Sadist' when l.slug='challenge' and i.role='verifier' then 'Sadomasochist' when l.slug='impossible' and i.role='creator' then 'Tormentor' when l.slug in ('future-demon','future_demon') and i.role='creator' then 'Visionary' end
 from public.ihps_tag_identity_links i join current_levels l on l.id=i.level_id where l.position=1
 union all select user_id,tag from public.ihps_tag_staff_grants
 union all select user_id,tag from public.ihps_tag_legacy
)
select distinct user_id,tag from auto_tags where tag is not null;

-- Views with security_invoker require read access on underlying tables. If your
-- existing RLS blocks reading accepted records, use the safe SECURITY DEFINER
-- RPC below; it checks only the requested public profile and exposes tags only.
create or replace function public.ihps_get_player_tags(p_user_id uuid)
returns table(tag text, equipped boolean)
language sql stable security definer set search_path = '' as $$
 select e.tag,(e.tag=p.equipped_tag) equipped
 from public.ihps_tag_eligibility e
 left join public.ihps_tag_preferences p on p.user_id=e.user_id
 where e.user_id=p_user_id order by e.tag;
$$;
revoke all on function public.ihps_get_player_tags(uuid) from public;
grant execute on function public.ihps_get_player_tags(uuid) to anon,authenticated;

create or replace function public.ihps_equip_tag(p_tag text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if p_tag is not null and not exists(select 1 from public.ihps_tag_eligibility where user_id=auth.uid() and tag=p_tag) then
  raise exception 'This tag is not currently unlocked';
 end if;
 insert into public.ihps_tag_preferences(user_id,equipped_tag) values(auth.uid(),p_tag)
 on conflict(user_id) do update set equipped_tag=excluded.equipped_tag;
end;$$;
revoke all on function public.ihps_equip_tag(text) from public;
grant execute on function public.ihps_equip_tag(text) to authenticated;

-- Omni-Slayer is stamped permanently as soon as all current levels are completed.
create or replace function public.ihps_award_omni_slayer()
returns void language sql security definer set search_path = '' as $$
 insert into public.ihps_tag_legacy(user_id,tag)
 select c.user_id,'Omni-Slayer' from (
  select p.user_id,
   (select count(*) from public.levels l join public.lists s on s.id=l.list_id where lower(s.slug)='demon') d_total,
   (select count(*) from public.levels l join public.lists s on s.id=l.list_id where lower(s.slug)='challenge') c_total,
   (select count(distinct r.level_id) from public.record_submissions r join public.levels l on l.id=r.level_id join public.lists s on s.id=l.list_id where r.user_id=p.user_id and r.status='accepted' and r.percent=100 and lower(s.slug)='demon') d_done,
   (select count(distinct r.level_id) from public.record_submissions r join public.levels l on l.id=r.level_id join public.lists s on s.id=l.list_id where r.user_id=p.user_id and r.status='accepted' and r.percent=100 and lower(s.slug)='challenge') c_done
  from public.player_profiles p
 ) c where c.d_total>0 and c.c_total>0 and c.d_done=c.d_total and c.c_done=c.c_total
 on conflict do nothing;
$$;
revoke all on function public.ihps_award_omni_slayer() from public;
-- Backfill all existing registered players NOW.
select public.ihps_award_omni_slayer();

create or replace function public.ihps_omni_award_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform public.ihps_award_omni_slayer(); return null;
end;$$;
drop trigger if exists ihps_omni_records on public.record_submissions;
create trigger ihps_omni_records after insert or update of status,percent,level_id or delete on public.record_submissions
for each statement execute function public.ihps_omni_award_trigger();
drop trigger if exists ihps_omni_levels on public.levels;
create trigger ihps_omni_levels after insert or update of list_id or delete on public.levels
for each statement execute function public.ihps_omni_award_trigger();
