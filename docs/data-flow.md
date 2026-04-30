# 식집사 — 데이터 플로우 & DB 설계안

> 현재 상태: UI/레이아웃은 완성, 백엔드는 **설계만 된 상태**.
> 이 문서는 DB/Auth/Storage/알림을 **실제로 붙일 때의 순서·계약·정책**을 기록합니다.
> 구현이 아니라 "합의된 계획" 이 목적 — 의문점은 §10 에 모아둠.

---

## 0. 설계 원칙

- **Supabase 단일 백엔드** — Auth + Postgres + Storage + Realtime + Edge Functions.
  한 번 찍어 맞추면 운영 비용·복잡도 모두 가장 낮음.
- **Client-first UI** — 모든 쓰기 동작은 Zustand 에서 optimistic 선반영, Supabase 호출은 백그라운드.
  실패 시 즉시 롤백(이미 `store/plants.ts` 에 골격 있음).
- **RLS 로 owner 격리** — 모든 테이블이 `owner_id = auth.uid()` 필터. 서버 측에서 막고, 앱은 자기 데이터만 본다고 가정.
- **오프라인 읽기 > 오프라인 쓰기** — MVP 에선 읽기만 캐시 (AsyncStorage/MMKV), 오프라인 쓰기 큐는 v2.

---

## 1. 인증 (Auth)

### 채택: Supabase Auth + 소셜 프로바이더

| Provider | Supabase 지원 | 필요 자원 |
|---|---|---|
| **Google** | 기본 제공 | Google Cloud Console 의 OAuth Client ID, redirect URL 등록 |
| **Apple** | 기본 제공 | Apple Developer 계정, Services ID + Sign-in Key. iOS 빌드는 `Sign in with Apple` entitlement 필수 |
| **Kakao** | 미지원 | 두 가지 경로 중 택 1 — 아래 참고 |

### Kakao 로그인 — 두 가지 옵션

1. **Kakao SDK + Edge Function 중계 (권장)**
   - 앱: `@react-native-seoul/kakao-login` 으로 로그인 → ID token 획득
   - Edge Function `/auth/kakao`: ID token 을 Kakao OIDC 엔드포인트로 검증 → Supabase Admin SDK 로 user upsert + 세션 생성 → 클라이언트로 세션 반환
   - 유지보수 가능, 비용 Free 플랜에서도 동작
2. **Supabase Custom OAuth Provider** (Pro 플랜)
   - Kakao OpenID 엔드포인트만 등록하면 Supabase 가 처리
   - 훨씬 간단, 단 유료

→ **v1 MVP 에선 Google + Apple 로 시작, Kakao 는 v1.5 에 Edge Function 으로 추가**.

### 딥링크

- 앱 스킴 `sikjipsa://` 는 이미 `app.json` 에 등록.
- Supabase Dashboard > Authentication > URL Configuration 에 아래 redirect 추가:
  - `sikjipsa://auth/callback` (네이티브)
  - `http://localhost:8090/auth/callback` (웹 dev)
  - 프로덕션 웹 도메인

### 최초 로그인 트리거

`auth.users` INSERT 시 Postgres 트리거로:
- `profiles` 행 생성 (display_name, avatar_url 프로바이더 메타에서 복사)
- 기본 공간 3개 (`거실`, `침실`, `베란다`) 를 `locations` 에 seed

```sql
create or replace function public.on_auth_user_created()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  insert into public.locations (owner_id, name, sort_order) values
    (new.id, '거실',   0),
    (new.id, '침실',   1),
    (new.id, '베란다', 2);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();
```

---

## 2. 데이터 모델

### 2.1 `profiles` — 유저 프로필 + 앱 설정 persist

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| display_name | text | 초기값: 프로바이더의 이름 |
| avatar_url | text nullable | |
| theme | text default 'system' | `'light' \| 'dark' \| 'system'` |
| accent | text default 'green' | `'green' \| 'sage' \| 'ochre' \| 'forest'` |
| font | text default 'pretendard' | `'pretendard' \| 'gothic' \| 'serif-mix'` |
| expo_push_token | text nullable | v2 서버 푸시용 |
| created_at | timestamptz default now() | |

**용도**: ThemeProvider 가 앱 부팅 시 읽어와 AsyncStorage 대신 서버 persist 로 사용하면 기기 간 설정 동기화.

### 2.2 `locations` — 공간

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| owner_id | uuid | FK → `auth.users` ON DELETE CASCADE |
| name | text | 거실/침실/베란다/온실장/… |
| sort_order | int default 0 | 사이드바 노출 순서 |
| default_light | text nullable | 새 식물 추가 시 기본값 |
| default_humidity | text nullable | |
| created_at | timestamptz default now() | |

**인덱스**: `(owner_id, sort_order)`

### 2.3 `plants` — 핵심 엔티티

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| owner_id | uuid | FK, RLS 키 |
| location_id | uuid nullable | FK → `locations` ON DELETE SET NULL |
| name | text | 애칭 |
| species | text | 학명 |
| photo_url | text nullable | Storage 경로 |
| thumb_color | text | 사진 없을 때 placeholder 배경 |
| thumb_mood | text | placeholder 구성 (`velvet`/`tropical`/…) |
| light | text | '밝은 간접광' 등 |
| humidity | text | '높음 70%+' 등 |
| water_cycle_days | int check (water_cycle_days > 0) | |
| fert_cycle_days | int check (fert_cycle_days > 0) | |
| last_water | date | |
| last_fert | date | |
| next_water | date | **denormalized**: last_water + water_cycle_days. 쓰기 시 갱신 |
| note | text default '' | |
| created_at | timestamptz default now() | |
| updated_at | timestamptz default now() | 트리거로 자동 갱신 |
| deleted_at | timestamptz nullable | soft delete |

**인덱스**:
- `(owner_id, next_water) WHERE deleted_at IS NULL` — "오늘 할 일" 쿼리
- `(owner_id, location_id) WHERE deleted_at IS NULL` — 공간 필터
- `(owner_id) WHERE deleted_at IS NULL` — 기본 list

**왜 next_water 를 저장?** read-heavy 라서 매번 `last_water + cycle` 계산하면 인덱스 못 탐. 쓰기 한 번 할 때 계산해서 저장 → "오늘 할 일" 쿼리가 `WHERE next_water <= today` 로 인덱스 seek.

### 2.4 `plant_logs` — 타임라인

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint GENERATED ALWAYS AS IDENTITY PK | |
| plant_id | uuid | FK → `plants(id)` ON DELETE CASCADE |
| owner_id | uuid | **denormalized**: RLS 정책이 plants join 없이 동작하게 |
| action | text check (action in ('water','fert','prune','repot','note','photo')) | |
| occurred_at | timestamptz default now() | |
| note | text default '' | |
| photo_url | text nullable | `action='photo'` 일 때 |
| created_at | timestamptz default now() | |

**인덱스**:
- `(plant_id, occurred_at desc)` — 상세 히스토리 탭
- `(owner_id, occurred_at desc)` — 전체 피드 (홈 대시보드용, v2)

### 2.5 관계

```
auth.users (1) ─── (1) profiles
auth.users (1) ─── (N) locations
auth.users (1) ─── (N) plants
plants     (1) ─── (N) plant_logs
locations  (1) ─── (N) plants   (nullable FK)
```

---

## 3. Storage

### Bucket: `plant-photos`

- 경로 컨벤션: `{owner_id}/{plant_id}/{timestamp}.jpg`
- 앱에서 `expo-image-picker` → `expo-image-manipulator` 로 리사이즈 (1024px 원본, 512/256 썸네일) → 업로드
- `plants.photo_url` 에는 Storage public URL 저장

### RLS (Storage Policies)

```sql
create policy "users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read own photos"
  on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 4. 데이터 플로우

### 4.1 앱 부팅 → 초기 로드

```
앱 시작
 ↓
ThemeProvider hydrate (AsyncStorage → 세션 아직 없으니 로컬 prefs)
 ↓
supabase.auth.getSession()
  ├─ 세션 없음 → /index (Onboarding) → OAuth
  └─ 세션 있음 ↓
 ↓
병렬 fetch:
  - profiles (id = uid)   → ThemeProvider 서버값 덮어쓰기
  - locations (owner_id)  → 사이드바 공간 목록
  - plants   (owner_id, deleted_at IS NULL)
  - plant_logs (owner_id, occurred_at >= now - 60d)
 ↓
Zustand store 채우기 → UI 렌더
 ↓
supabase.realtime.channel subscribe (plants, plant_logs)
```

### 4.2 쓰기 — 물주기 (이미 `store/plants.ts` 에 골격 존재)

```
사용자 탭
 ↓
Zustand optimistic:
  plant.last_water = today
  plant.next_water = today + water_cycle_days
  logs.unshift({ action: 'water', occurred_at: now, plant_id })
 ↓
병렬:
  supabase.from('plants').update({ last_water, next_water }).eq('id', plant.id)
  supabase.from('plant_logs').insert({ plant_id, owner_id, action: 'water' })
 ↓
성공 → Notifications.cancel(previousId) → scheduleNotification(next_water @ 09:00)
실패 → Zustand 롤백 + 토스트 "다시 시도해주세요"
```

### 4.3 쓰기 — 식물 추가

```
Add Modal 완료
 ↓
(선택) expo-image-picker → 사진 촬영/선택
 ↓
(선택) 이미지 리사이즈 → Storage 업로드 → photo_url
 ↓
(새 공간이면) locations insert → location_id
 ↓
plants insert (next_water = last_water + cycle 로 미리 계산)
 ↓
로컬 store 업데이트 (insert 응답의 id 로) → 홈으로 navigate
```

### 4.4 Realtime 동기화

Supabase Dashboard > Database > Replication 에서 `plants`, `plant_logs` 활성화.

```ts
const channel = supabase
  .channel('user-data')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'plants', filter: `owner_id=eq.${uid}` },
    (payload) => applyPlantChange(payload)
  )
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'plant_logs', filter: `owner_id=eq.${uid}` },
    (payload) => applyLogInsert(payload)
  )
  .subscribe();
```

**목적**: 폰과 태블릿에서 동시에 열어도 물주기 탭이 서로 반영됨. 단일 기기 사용자면 없어도 되지만, 비용 거의 없어서 기본 ON 권장.

### 4.5 충돌 해결

두 기기가 거의 동시에 물주기 → 둘 다 INSERT 성공, plants UPDATE 는 나중 것이 이김 (last-write-wins via `updated_at`). 사용자 관점에서 물주기는 idempotent 성격이므로 문제 없음.

---

## 5. 알림

### MVP — 클라이언트 로컬 알림 (`expo-notifications`)

```ts
// 물주기 스토어 업데이트 직후
await Notifications.cancelScheduledNotificationAsync(plant.id);
await Notifications.scheduleNotificationAsync({
  identifier: plant.id,
  content: { title: `${plant.name} 물 줄 시간이에요`, body: '오늘 한 번 살펴볼까요?' },
  trigger: new Date(`${plant.next_water}T09:00:00`),
});
```

- 오프라인에서도 동작
- 앱을 완전히 지우면 사라짐 → 대부분 사용자는 OK

### v2 — 서버 푸시 (선택)

- `profiles.expo_push_token` 에 디바이스 토큰 저장 (앱 부팅 시 `Notifications.getExpoPushTokenAsync()`)
- Supabase Edge Function: 매일 오전 9시 cron
  ```sql
  select owner_id, id, name from plants
  where next_water = current_date and deleted_at is null
  ```
- Expo Push API 로 배치 발송

앱을 한 번도 켜지 않은 날에도 알림 온다는 장점. MVP 에선 미포함.

---

## 6. 보안 (RLS)

모든 public 테이블 RLS 활성화 + 동일 형태 정책 4개 (select/insert/update/delete):

```sql
alter table public.plants enable row level security;

create policy "owner_read"   on public.plants for select using (auth.uid() = owner_id);
create policy "owner_write"  on public.plants for insert with check (auth.uid() = owner_id);
create policy "owner_update" on public.plants for update using (auth.uid() = owner_id);
create policy "owner_delete" on public.plants for delete using (auth.uid() = owner_id);
```

`plant_logs` 도 동일 패턴 — `owner_id` 를 denormalize 해 두면 plants JOIN 없이 RLS 체크 가능해서 훨씬 빠르고 단순.

`storage.objects` 는 §3 RLS 참고.

---

## 7. 타입 생성

`supabase gen types typescript` 로 Postgres → TS 타입 자동 생성:

```bash
supabase gen types typescript --project-id xxxx > src/types/database.ts
```

그 다음 `plantRepo.ts` 의 수동 매핑(`PlantRow` 등)을 이 자동생성 타입으로 교체하면 스키마 drift 를 컴파일 타임에 잡을 수 있음.

---

## 8. 마이그레이션 순서 (DB 생성 체크리스트)

1. [ ] Supabase 프로젝트 생성
2. [ ] Auth Providers: Google, Apple 등록
3. [ ] `supabase/schema.sql` 확장판 (profiles/locations 추가) 실행
4. [ ] `on_auth_user_created` 트리거 생성
5. [ ] `plant-photos` Storage bucket + RLS 정책
6. [ ] Realtime replication: `plants`, `plant_logs` ON
7. [ ] `supabase gen types` → `src/types/database.ts` 커밋
8. [ ] 앱 `.env` 에 URL/ANON_KEY 세팅
9. [ ] 테스트 유저 생성 → 25개 seed 를 개발 편의상 로컬에서 해당 유저 id 로 insert (optional)

---

## 9. 단계별 로드맵

### v1.0 — MVP (2–3주)

- [ ] 스키마(profiles / locations / plants / plant_logs) 생성 + 트리거
- [ ] Google + Apple OAuth 로그인
- [ ] `plantRepo` Supabase 실연결 (현재 seed fallback 유지 → 배포 시 `hasSupabase=true` 경로만 사용)
- [ ] 사진 업로드 (expo-image-picker → Storage)
- [ ] 로컬 알림 (물주기만)
- [ ] Profile 테마/폰트 서버 persist (ThemeProvider 가 supabase 에서도 로드)

### v1.5 — 확장

- [ ] Kakao 로그인 (Edge Function 중계)
- [ ] Realtime 동기화 ON
- [ ] 오프라인 쓰기 큐 (NetInfo + MMKV pending mutations)
- [ ] 비료/가지치기/분갈이 기록 UI (현재는 버튼만 존재)
- [ ] 성장 사진 갤러리 (plant_logs.photo_url 활용)

### v2.0 — 고도화

- [ ] 서버 cron 푸시 (Edge Function + Expo Push)
- [ ] 공유 정원 (가족 계정) — `plant_shares(plant_id, viewer_id, role)`
- [ ] 식물 도감 자동 채우기 (학명 입력 시 AI/외부 API 로 광량/습도/주기 추천)
- [ ] 프리미엄 구독 (무제한 사진/식물)

---

## 10. 남은 결정사항 — 사용자 확인 필요

| # | 질문 | 기본 안 |
|---|---|---|
| 1 | 소셜 외 **이메일/비밀번호** 로그인 제공? | 제공 안 함. 소셜만 유지해 계정 복구 복잡도 낮춤 |
| 2 | Kakao 를 MVP 에 넣을지, v1.5 로 미룰지? | v1.5. 한국 사용자 커버는 중요하지만 Edge Function 복잡도 + 배포 지연 리스크 큼 |
| 3 | 식물 삭제 시 log 동작? | plants soft delete, logs 는 그대로 유지 (타임라인 완전성) |
| 4 | 공간은 유저별 vs 전역? | 유저별 (이미 `locations.owner_id` 설계) |
| 5 | 게스트 모드 (로그인 없이 로컬에서만 기록) 지원? | v1.0 미지원. 로그인 강제 — 데이터 유실 리스크 방지 |
| 6 | 프로덕션 웹 배포 도메인? | (미정 — `vercel.app`? 자체 도메인?) |
| 7 | 25종 seed 를 신규 유저에게 기본 제공? | 제공 안 함. 빈 상태 + "첫 식물 추가하기" CTA |

---

## 11. 질문/피드백

- 이 문서대로 진행해도 되는지, 특히 §10 항목들에 대한 답
- 디자인상 "공간" 프리셋이 고정인지 (온실장/거실/베란다/침실 모두 생성 가능하게 할지)
- 사진 없이 식물 등록 가능 vs 필수?

답 오면 다음 단계로 `supabase/schema.sql` 확장판 작성 + `plantRepo` 실연결 작업 착수.
