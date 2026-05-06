-- 신규 가입자 기본 공간을 거실 하나만 시드.
-- 기존 가입자는 영향 없음 (이 함수는 INSERT 트리거이므로 새 가입에만 동작).

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
    (new.id, '거실', 0);

  return new;
end $$;
