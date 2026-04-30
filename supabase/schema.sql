-- 식집사 — Supabase schema (v1)
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 전체 붙여넣고 Run
-- 이미 테이블이 있을 때도 안전하게 재실행 가능하도록 IF NOT EXISTS / OR REPLACE 사용.

-- ───────────────────────────────────────────
-- Extensions
-- ───────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ───────────────────────────────────────────
-- profiles — 유저 프로필 + 앱 설정 persist
-- ───────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  avatar_url     text,
  theme          text not null default 'system' check (theme in ('light','dark','system')),
  accent         text not null default 'green'  check (accent in ('green','sage','ochre','forest')),
  font           text not null default 'pretendard' check (font in ('pretendard','gothic','serif-mix')),
  expo_push_token text,
  created_at     timestamptz not null default now()
);

-- ───────────────────────────────────────────
-- locations — 유저별 공간
-- ───────────────────────────────────────────
create table if not exists public.locations (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  sort_order        integer not null default 0,
  default_light     text,
  default_humidity  text,
  created_at        timestamptz not null default now()
);

create index if not exists locations_owner_idx on public.locations (owner_id, sort_order);

-- ───────────────────────────────────────────
-- plants — 핵심 엔티티
-- ───────────────────────────────────────────
create table if not exists public.plants (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete set null,
  name             text not null,
  species          text not null default '',
  photo_url        text,
  thumb_color      text not null default '#4a6a4a',
  thumb_mood       text not null default 'tropical'
                     check (thumb_mood in ('velvet','silver','frond','tropical','variegated','tree','trailing','succulent','seedling')),
  light            text not null default '밝은 간접광',
  humidity         text not null default '보통',
  water_cycle_days integer not null check (water_cycle_days > 0),
  fert_cycle_days  integer not null default 30 check (fert_cycle_days > 0),
  last_water       date not null,
  last_fert        date not null,
  next_water       date not null,
  note             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- "오늘 할 일" 쿼리 최적화
create index if not exists plants_owner_next_water_idx
  on public.plants (owner_id, next_water)
  where deleted_at is null;

-- 공간별 필터
create index if not exists plants_owner_location_idx
  on public.plants (owner_id, location_id)
  where deleted_at is null;

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists plants_touch_updated_at on public.plants;
create trigger plants_touch_updated_at
  before update on public.plants
  for each row execute function public.touch_updated_at();

-- ───────────────────────────────────────────
-- plant_logs — 타임라인 (물주기/비료/가지치기/분갈이/메모/사진)
-- ───────────────────────────────────────────
create table if not exists public.plant_logs (
  id           bigint generated always as identity primary key,
  plant_id     uuid not null references public.plants(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  action       text not null check (action in ('water','fert','prune','repot','note','photo')),
  occurred_at  timestamptz not null default now(),
  note         text not null default '',
  photo_url    text,
  created_at   timestamptz not null default now()
);

create index if not exists plant_logs_plant_idx
  on public.plant_logs (plant_id, occurred_at desc);

create index if not exists plant_logs_owner_idx
  on public.plant_logs (owner_id, occurred_at desc);

-- ───────────────────────────────────────────
-- 신규 가입자 트리거: profiles 행 생성 + 기본 공간 3개 seed
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

  insert into public.locations (owner_id, name, sort_order) values
    (new.id, '거실',   0),
    (new.id, '침실',   1),
    (new.id, '베란다', 2);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ───────────────────────────────────────────
-- RLS — owner_id = auth.uid()
-- ───────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.locations  enable row level security;
alter table public.plants     enable row level security;
alter table public.plant_logs enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- locations
drop policy if exists "locations_read_own" on public.locations;
create policy "locations_read_own"
  on public.locations for select
  using (auth.uid() = owner_id);

drop policy if exists "locations_write_own" on public.locations;
create policy "locations_write_own"
  on public.locations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- plants
drop policy if exists "plants_read_own" on public.plants;
create policy "plants_read_own"
  on public.plants for select
  using (auth.uid() = owner_id);

drop policy if exists "plants_write_own" on public.plants;
create policy "plants_write_own"
  on public.plants for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- plant_logs
drop policy if exists "plant_logs_read_own" on public.plant_logs;
create policy "plant_logs_read_own"
  on public.plant_logs for select
  using (auth.uid() = owner_id);

drop policy if exists "plant_logs_write_own" on public.plant_logs;
create policy "plant_logs_write_own"
  on public.plant_logs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
