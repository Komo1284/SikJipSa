-- 식집사 — Migration 003: plant-photos bucket + RLS
-- 실행 방법: Supabase Dashboard → SQL Editor → New query → 붙여넣고 Run

-- ───────────────────────────────────────────
-- 1. Storage bucket 생성 (public — 누구나 URL 로 조회 가능)
-- ───────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- ───────────────────────────────────────────
-- 2. 업로드/삭제는 로그인 유저가 자기 폴더에만
-- 파일 경로 컨벤션: {owner_uid}/{plant_id}/{timestamp}.jpg
-- ───────────────────────────────────────────
drop policy if exists "upload_own_folder" on storage.objects;
create policy "upload_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete_own_photos" on storage.objects;
create policy "delete_own_photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "update_own_photos" on storage.objects;
create policy "update_own_photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. 조회는 누구나 (public bucket). 나중에 private 가려면 아래 주석 제거 + insert 시 signed URL 사용
drop policy if exists "public_read_plant_photos" on storage.objects;
create policy "public_read_plant_photos"
  on storage.objects for select
  using (bucket_id = 'plant-photos');
