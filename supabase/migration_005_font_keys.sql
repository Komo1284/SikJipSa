-- 식집사 — Migration 005: font key rename
-- gothic / serif-mix → gowun / myeongjo
-- 실행: SQL Editor → New query → Run

-- 1. drop the old check constraint
alter table public.profiles drop constraint if exists profiles_font_check;

-- 2. migrate any existing rows to a safe value
update public.profiles
   set font = 'pretendard'
 where font not in ('pretendard', 'gowun', 'myeongjo');

-- 3. re-add with new allowed values
alter table public.profiles
  add constraint profiles_font_check
  check (font in ('pretendard', 'gowun', 'myeongjo'));
