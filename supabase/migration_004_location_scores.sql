-- 식집사 — Migration 004: 공간 수치 (일조량 / 공기순환량 1~5)
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 붙여넣고 Run

-- ───────────────────────────────────────────
-- 1. 1~5 점수 컬럼 추가 — 기존 텍스트 default_light/default_humidity 는 유지
-- ───────────────────────────────────────────
alter table public.locations
  add column if not exists light_score   integer not null default 3 check (light_score   between 1 and 5),
  add column if not exists airflow_score integer not null default 3 check (airflow_score between 1 and 5);

-- ───────────────────────────────────────────
-- 2. 신규 가입자 트리거에 온실장 포함 + 점수 채우기
-- ───────────────────────────────────────────
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.locations (owner_id, name, sort_order, light_score, airflow_score) values
    (new.id, '거실',   0, 4, 4),
    (new.id, '침실',   1, 2, 3),
    (new.id, '베란다', 2, 5, 5),
    (new.id, '온실장', 3, 3, 1);

  return new;
end $$;

-- ───────────────────────────────────────────
-- 3. 이미 가입한 유저에게도 온실장 백필 (없을 때만)
-- ───────────────────────────────────────────
insert into public.locations (owner_id, name, sort_order, light_score, airflow_score)
select p.id, '온실장', 3, 3, 1
  from public.profiles p
  where not exists (
    select 1 from public.locations l
      where l.owner_id = p.id and l.name = '온실장'
  );
