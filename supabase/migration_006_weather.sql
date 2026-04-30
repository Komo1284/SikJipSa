-- 식집사 — Migration 006: weather-aware watering recommendations
-- 1) profiles 에 위치 정보, 2) weather_observations 일별 캐시,
-- 3) plants 에 선호도 + 추천 컬럼, 4) locations 에 weather_weight.
-- 실행: SQL Editor → New query → 붙여넣고 Run

-- ───────────────────────────────────────────
-- 1. profiles — 식물이 있는 위치 (최초 로그인 1회 저장, Me 탭에서 수정 가능)
-- ───────────────────────────────────────────
alter table public.profiles
  add column if not exists lat              numeric,
  add column if not exists lng              numeric,
  add column if not exists place_label      text,         -- 예: "서울 영등포구"
  add column if not exists location_source  text          -- 'gps' | 'ip' | 'manual'
    check (location_source in ('gps','ip','manual')),
  add column if not exists location_set_at  timestamptz;

-- ───────────────────────────────────────────
-- 2. weather_observations — 사용자별 일 1행
-- ───────────────────────────────────────────
create table if not exists public.weather_observations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  date          date not null,
  lat           numeric,
  lng           numeric,
  temp_avg      real,
  temp_high     real,
  temp_low      real,
  humidity_avg  real,                  -- 0–100
  rain_mm       real,                  -- 일강수량
  source        text not null default 'open-meteo',
  fetched_at    timestamptz not null default now(),
  unique (owner_id, date)
);

create index if not exists weather_owner_date_idx
  on public.weather_observations (owner_id, date desc);

alter table public.weather_observations enable row level security;

drop policy if exists "weather_read_own"  on public.weather_observations;
create policy "weather_read_own"
  on public.weather_observations for select
  using (auth.uid() = owner_id);

drop policy if exists "weather_write_own" on public.weather_observations;
create policy "weather_write_own"
  on public.weather_observations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ───────────────────────────────────────────
-- 3. plants — 식물의 환경 선호도 + 추천 결과 캐시
-- ───────────────────────────────────────────
alter table public.plants
  add column if not exists species_humidity_pref   smallint
    check (species_humidity_pref between 1 and 5),
  add column if not exists species_light_pref      smallint
    check (species_light_pref between 1 and 5),
  add column if not exists recommended_next_water  date,
  add column if not exists recommendation_reason   text,
  add column if not exists recommendation_delta    real;     -- ±일수 (음수=빨라짐)

-- ───────────────────────────────────────────
-- 4. locations — 외부 날씨가 이 공간에 반영되는 비율 (0~1)
--    트리거 기본값으로 공간 이름에 따라 합리적 추정.
-- ───────────────────────────────────────────
alter table public.locations
  add column if not exists weather_weight  real not null default 0.5
    check (weather_weight between 0 and 1);

-- 기존 시드 행에 합리적 디폴트 백필 (한 번만 의미 있음)
update public.locations set weather_weight = 0.9 where name = '베란다' and weather_weight = 0.5;
update public.locations set weather_weight = 0.4 where name = '거실'   and weather_weight = 0.5;
update public.locations set weather_weight = 0.3 where name = '침실'   and weather_weight = 0.5;
update public.locations set weather_weight = 0.1 where name = '온실장' and weather_weight = 0.5;

-- 신규 가입자 트리거에도 weather_weight 반영
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

  insert into public.locations (owner_id, name, sort_order, light_score, airflow_score, weather_weight) values
    (new.id, '거실',   0, 4, 4, 0.4),
    (new.id, '침실',   1, 2, 3, 0.3),
    (new.id, '베란다', 2, 5, 5, 0.9),
    (new.id, '온실장', 3, 3, 1, 0.1);

  return new;
end $$;
