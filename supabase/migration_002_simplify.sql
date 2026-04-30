-- 식집사 — Migration 002: simplify location + auto owner_id
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 붙여넣고 Run
-- schema.sql 은 한 번 실행된 상태에서 추가로 돌리는 스크립트입니다.

-- ───────────────────────────────────────────
-- 1. plants.location_id(uuid FK) → plants.location(text) 로 단순화
-- ───────────────────────────────────────────
alter table public.plants drop column if exists location_id;
alter table public.plants add column if not exists location text not null default '거실';

drop index if exists plants_owner_location_idx;
create index if not exists plants_owner_location_idx
  on public.plants (owner_id, location)
  where deleted_at is null;

-- ───────────────────────────────────────────
-- 2. owner_id 자동 채움 — insert 할 때 일일이 보내지 않아도 세션에서 뽑아옴
-- ───────────────────────────────────────────
alter table public.plants     alter column owner_id set default auth.uid();
alter table public.plant_logs alter column owner_id set default auth.uid();
alter table public.locations  alter column owner_id set default auth.uid();
