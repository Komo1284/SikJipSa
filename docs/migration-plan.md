# 식집사 — Supabase → AWS 마이그레이션 대비 구현 가이드

> **가정** — Free/Pro 플랜으로 Supabase 를 쓰다가, 유저·데이터·트래픽이 넘치면 자체 인프라(RDS + EC2 Node.js / Lambda + S3 + Cognito)로 갈아탐.
> **목표** — "갈아타는 날" 의 작업을 **며칠 안에 끝낼 수 있도록** 지금부터 코드를 짜둔다.
> 데이터 모델·DB 스키마는 `docs/data-flow.md` 참고. 이 문서는 **코드 아키텍처와 계약(interface), 그리고 마이그레이션 플레이북**에 집중.

---

## 1. 핵심 원칙 — "Anti-corruption Layer"

앱 코드 **어디에서도 `@supabase/supabase-js` 를 직접 import 하지 않는다.**

모든 Supabase 접근은 `src/repo/` 레이어를 통과. UI·스토어·라우터는 "식물 가져오기", "물주기 기록하기" 같은 **도메인 언어** 로만 말하게 함. 백엔드를 갈아끼울 때 바뀌는 코드는 `src/repo/` 아래의 구현체들뿐.

```
app/ (screens)
src/components/ (UI)
src/store/  (Zustand — UI 상태)
     │
     ▼ 도메인 타입 · 도메인 메서드만 호출
src/repo/index.ts            (팩토리: 환경변수 보고 어떤 구현 쓸지 결정)
     │
     ├── src/repo/supabase/  (현재 구현)
     │     plantRepo.ts  authRepo.ts  storageRepo.ts  realtimeRepo.ts
     │
     └── src/repo/aws/       (나중 구현 — 지금은 빈 폴더)
           plantRepo.ts  authRepo.ts  storageRepo.ts  realtimeRepo.ts
     │
     ▼
`@supabase/supabase-js`      `@aws-amplify/*` · 자체 fetch 클라이언트
```

---

## 2. 구체적 인터페이스 정의

갈아탈 때 계약이 바뀌면 UI 전체를 건드려야 하므로, **인터페이스는 Supabase 냄새 0%** 로 도메인 타입만 노출.

### 2.1 `src/repo/types.ts` — 도메인 타입

```ts
// 이미 src/types/plant.ts 에 있는 Plant, LogEntry 그대로 재사용.
// 여기서는 Repo 레이어 전용 보조 타입만.

export type Session = {
  userId: string;          // uuid — 백엔드 독립적
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: 'google' | 'apple' | 'kakao';
};

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

export type Unsubscribe = () => void;

export type UploadResult = {
  path: string;        // 저장소 내 경로 (`{uid}/{plantId}/{ts}.jpg`)
  publicUrl: string;   // 즉시 쓸 수 있는 URL (CDN 경유)
};
```

### 2.2 `src/repo/contracts.ts` — Repository 인터페이스

```ts
import type { LogEntry, Plant } from '@/types/plant';
import type { AuthChangeEvent, Session, Unsubscribe, UploadResult } from './types';

export interface AuthRepo {
  getSession(): Promise<Session | null>;
  signInWithProvider(provider: 'google' | 'apple' | 'kakao'): Promise<Session>;
  signOut(): Promise<void>;
  onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void): Unsubscribe;
}

export interface PlantRepo {
  list(): Promise<Plant[]>;
  get(id: string): Promise<Plant | null>;
  create(plant: Plant): Promise<Plant>;
  update(id: string, patch: Partial<Plant>): Promise<Plant>;
  softDelete(id: string): Promise<void>;
}

export interface LogRepo {
  listForPlant(plantId: string, limit?: number): Promise<LogEntry[]>;
  listRecent(days: number): Promise<LogEntry[]>;
  insert(entry: Omit<LogEntry, 'id'>): Promise<LogEntry>;
}

export interface StorageRepo {
  uploadPhoto(plantId: string, fileUri: string): Promise<UploadResult>;
  deletePhoto(path: string): Promise<void>;
}

export interface RealtimeRepo {
  subscribeToPlants(ownerId: string, handler: (plant: Plant) => void): Unsubscribe;
  subscribeToLogs(ownerId: string, handler: (log: LogEntry) => void): Unsubscribe;
}

export type Repos = {
  auth: AuthRepo;
  plants: PlantRepo;
  logs: LogRepo;
  storage: StorageRepo;
  realtime: RealtimeRepo;
};
```

### 2.3 `src/repo/index.ts` — 런타임 팩토리

```ts
import * as supabaseImpl from './supabase';
// import * as awsImpl from './aws';  // 나중에 활성화

import type { Repos } from './contracts';

const driver = process.env.EXPO_PUBLIC_BACKEND ?? 'supabase';

export const repos: Repos =
  driver === 'aws' ? /* awsImpl.createRepos() */ (() => { throw new Error('AWS repos not implemented yet'); })() :
  supabaseImpl.createRepos();
```

**플립 스위치 하나로 교체 가능**해짐. 앱 코드는 `import { repos } from '@/repo'` 한 줄만 바뀌지 않음.

### 2.4 호출 측

UI/스토어 예시:

```ts
// src/store/plants.ts
import { repos } from '@/repo';

export const usePlantStore = create<PlantStore>((set, get) => ({
  plants: [], log: [], loading: false, error: null,

  async load() {
    const [plants, log] = await Promise.all([repos.plants.list(), repos.logs.listRecent(60)]);
    set({ plants, log });
  },

  async waterPlant(id) {
    // optimistic ... (현재와 동일)
    await Promise.all([
      repos.plants.update(id, { lastWater, nextWater }),
      repos.logs.insert({ plantId: id, action: 'water', date: today }),
    ]);
  },
}));
```

→ `repos` 뒤가 Supabase 든 AWS 든 스토어는 모름.

---

## 3. 현재 구조 교정 체크리스트

현재 코드 상태 대비 해야 할 일 (마이그레이션 대비로는 **지금 하는 게 이득**):

- [ ] `src/lib/plantRepo.ts` → `src/repo/supabase/plantRepo.ts` 로 이동 + `PlantRepo` 인터페이스 구현체로 재작성
- [ ] `src/lib/supabase.ts` → `src/repo/supabase/client.ts` 로 이동 (이 파일은 `src/repo/supabase/` 바깥에서 절대 import 안 되게)
- [ ] `AuthRepo` 구현: `supabase.auth.signInWithOAuth({ provider: 'google' })` 등을 감싸서 도메인 `Session` 반환
- [ ] `StorageRepo` 구현: `supabase.storage.from('plant-photos').upload(...)` 감싸기
- [ ] `RealtimeRepo` 구현: `supabase.channel(...)` 감싸기
- [ ] `src/repo/index.ts` 팩토리 추가
- [ ] 기존 코드에서 `import { supabase } from '@/lib/supabase'` 전수 검색 → 전부 `repos.*` 로 교체
- [ ] `src/repo/aws/` 빈 폴더 + `.gitkeep` 만 둬서 의도를 명시

### 의존성 방어선 (중요)

`src/repo/supabase/` **바깥에서** `@supabase/supabase-js` 를 import 못 하도록 강제. 두 가지 방법:

**방법 A — ESLint 규칙** (`no-restricted-imports`):
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "@supabase/supabase-js",
        "message": "Use repos from '@/repo' instead. Only src/repo/supabase/* may import supabase-js."
      }]
    }]
  },
  "overrides": [{
    "files": ["src/repo/supabase/**/*"],
    "rules": { "no-restricted-imports": "off" }
  }]
}
```

**방법 B — tsconfig.json paths 제거** + 래퍼 export 만 제공.

둘 다 해두면 완벽. 최소 방법 A 는 꼭.

---

## 4. 설계상 "피해야 할" Supabase 전용 의존

| 기능 | 쓰면 안 됨? | 이유 / 대안 |
|---|---|---|
| **Postgres (RLS/trigger/function)** | ✅ 써도 됨 | 표준 Postgres 기능 → RDS 에서 그대로 동작 |
| **Realtime** | ⚠️ 래퍼 통해서만 | AWS 가면 AppSync 구독 또는 Socket.io 로 바뀜. 인터페이스 뒤에만 둠 |
| **Storage** | ✅ 써도 됨 | S3 호환 API 라 `aws s3 sync` 가능 |
| **Auth (Row-Level JWT claim)** | ⚠️ 주의 | `auth.uid()` 는 Supabase Auth 의 JWT `sub` 클레임. AWS 가면 Cognito `sub` 로 교체 필요 → 섹션 6 참고 |
| **Edge Functions** | 🟡 최소화 | Kakao 로그인 중계 1개만. 나머지 비즈니스 로직은 Postgres function 또는 클라이언트에 둠 |
| **pg_net, pg_graphql, pgsodium, vault** | ❌ 쓰지 말 것 | Supabase 전용 확장. 쓰면 마이그레이션 시 분리 작업 필요 |
| **Supabase Broadcast/Presence** | ❌ 쓰지 말 것 | 순수 Supabase Realtime 기능. 대체 쉽지 않음 |
| **Supabase Database Webhooks** | 🟡 가능하면 피하기 | RDS 엔 없음. 필요하면 Postgres `LISTEN/NOTIFY` + 클라이언트 쪽 처리 |

---

## 5. Auth 마이그레이션 — 가장 어려운 조각

### 5.1 원리

Supabase Auth 의 유저 = `auth.users` 테이블의 UUID (`id` = JWT `sub`).
AWS Cognito 의 유저 = User Pool 안의 `sub` (UUID).

**OAuth 만 쓴다면** 마이그레이션이 꽤 깔끔:
- 유저가 Google 로 재로그인 → Cognito 가 `email` 로 식별 → 이전 `supabase_uid` 와 매핑 → 기존 데이터 그대로 보임
- 비밀번호 해시 이전 불필요 (애초에 우리가 저장 안 함)

이 시나리오를 보장하려면:
- 로그인은 **무조건 OAuth 만 제공** (§data-flow §10 기본안 유지)
- 유저의 `email` 을 `profiles` 에 복사 저장 (Supabase 의 `auth.users.email` 이 AWS 측으로 넘어가지 않으므로 자체 백업)

### 5.2 매핑 테이블

마이그레이션 데이에 만드는 테이블 (RDS 쪽):

```sql
create table user_mapping (
  cognito_sub   uuid primary key,
  legacy_uid    uuid unique not null,   -- 기존 Supabase auth.users.id
  email         text not null,
  migrated_at   timestamptz default now()
);
```

**매핑 채우는 법 2가지**:

1. **즉시 매핑 (bulk)**: `pg_dump` 시 `auth.users.email` + `id` 쌍을 Cognito Admin API 로 일괄 create → `user_mapping` 에 기록. 단점: 모든 유저를 Cognito 에 미리 등록해야 해서 MAU 과금 발생
2. **lazy 매핑**: 첫 로그인 때 Cognito 가 `email` 로 기존 `legacy_uid` 를 찾아 바인딩. 단점: 이전 데이터가 일시적으로 숨겨짐 → 마이그레이션 후 며칠 내 유저가 재로그인해야 함

대부분의 경우 **lazy 매핑 권장** — 유저 밀도 낮고 OAuth 라 재로그인 부담 작음.

### 5.3 RLS 갈아끼우기

현재 RLS:
```sql
create policy "owner_read" on plants for select using (auth.uid() = owner_id);
```

마이그레이션 후:
```sql
-- JWT claim `cognito:sub` 를 읽어 user_mapping 을 통해 legacy_uid 확인
create policy "owner_read" on plants for select using (
  owner_id = (select legacy_uid from user_mapping where cognito_sub = (current_setting('request.jwt.claim.sub')::uuid))
);
```

또는 아예 `plants.owner_id` 를 `cognito_sub` 값으로 UPDATE 해서 매핑을 아예 없애는 방법도 있음 (one-shot migration SQL).

---

## 6. Supabase 기능별 대체 매트릭스

| Supabase 기능 | AWS 대응 | 코드 변경량 |
|---|---|---|
| `supabase.auth.signInWithOAuth` | `Amplify.Auth.federatedSignIn` 또는 Cognito Hosted UI | `src/repo/aws/authRepo.ts` 만 |
| `supabase.from('plants').select()` | `GET /api/plants` (Express/Lambda) | `src/repo/aws/plantRepo.ts` 만 |
| `supabase.from('plants').upsert()` | `POST/PATCH /api/plants` | 동일 |
| Storage: `.upload(path, file)` | pre-signed PUT URL → S3 직접 업로드 | `src/repo/aws/storageRepo.ts` 만 |
| Storage: `.getPublicUrl()` | CloudFront URL 반환 | 동일 |
| Realtime: `.channel().on('postgres_changes', ...)` | AppSync Subscription 또는 Socket.io | `src/repo/aws/realtimeRepo.ts` 만 |
| RLS | API 라우터 handler 에서 JWT 파싱 후 쿼리에 `WHERE owner_id = ?` 조건 박음 | 백엔드 쪽 전부 |
| Edge Function | Lambda 함수 | Kakao 로그인 Edge Function → Lambda 포팅 |
| Database webhook | `LISTEN/NOTIFY` + Node.js 프로세스 | 해당 기능 사용 시 |

---

## 7. 데이터 마이그레이션 "그 날" 플레이북

가정: Supabase Pro 에서 AWS (RDS Postgres + S3 + Cognito + EC2 Node.js) 로 옮긴다.

### D-14 (2주 전)
- [ ] AWS 계정 설정: VPC, 서브넷, IAM 역할
- [ ] RDS Postgres 인스턴스 생성 (dev 환경으로)
- [ ] S3 bucket `sikjipsa-prod-photos` + CloudFront + OAC (Origin Access Control)
- [ ] Cognito User Pool + Google/Apple/Kakao OIDC 프로바이더 설정
- [ ] EC2 (또는 ECS Fargate) 에 Express+Prisma 앱 배포 — **현재 Supabase 랑 같이 돌아가게**, feature flag off
- [ ] `src/repo/aws/*` 구현 완료 — staging 환경에서 모든 기능 동작 확인

### D-7 (1주 전)
- [ ] 전체 유저에게 "점검 공지" 인앱 배너 노출
- [ ] 로컬에서 Supabase → RDS pg_dump/restore 리허설, 시간 측정
- [ ] Cutover 스크립트 준비 (sync, mapping create, 검증 쿼리)
- [ ] 롤백 계획 서면화

### D-day (자정 점검 기준 예시)

| 시각 | 작업 | 소요 |
|---|---|---|
| 00:00 | 앱에 점검 모드 플래그 켜기 (쓰기 차단, 읽기 허용) | 1분 |
| 00:05 | `pg_dump --format=custom` from Supabase | ~10분 (예상 1GB 이하) |
| 00:20 | Supabase Storage → S3 `aws s3 sync` | ~30분 (예상 수 GB) |
| 00:55 | `pg_restore` to RDS | ~15분 |
| 01:15 | `user_mapping` 테이블 생성 + 기존 `owner_id` 를 Cognito sub 로 일괄 UPDATE (사전 생성된 매핑 있으면) / 또는 lazy 매핑 그대로 | 10분 |
| 01:30 | 스키마 검증 쿼리 실행 (행 수·인덱스·FK·RLS) | 10분 |
| 01:45 | 앱에서 `EXPO_PUBLIC_BACKEND=aws` 로 OTA 업데이트 배포 | 15분 |
| 02:15 | Smoke test: 테스트 계정 로그인 → 식물 리스트 → 물주기 → 사진 업로드 | 15분 |
| 02:30 | 점검 모드 해제 | 1분 |
| 02:30~ | CloudWatch·Sentry 대시보드 집중 감시 48시간 | |

### D+14
- [ ] 문제 없으면 Supabase 프로젝트 read-only 로 전환 → 1개월 후 삭제
- [ ] `src/repo/supabase/*` 코드 삭제 + `repo/index.ts` 분기 제거

---

## 8. 리허설 체크리스트 (프로덕션 전에 staging 에서)

- [ ] 새 유저 가입 — OAuth 세 프로바이더 모두 작동
- [ ] 기존 유저 로그인 → lazy 매핑으로 데이터 복구 확인
- [ ] 식물 CRUD 각 엔드포인트 호출 (`POST/GET/PATCH/DELETE /api/plants`)
- [ ] 물주기 → `plant_logs` insert + `next_water` 업데이트 확인
- [ ] 사진 업로드: pre-signed URL 발급 → S3 PUT → CloudFront 에서 조회
- [ ] Realtime: 두 기기에서 동일 유저 로그인, 한쪽에서 물주기 → 다른 쪽 반영
- [ ] RLS 침투 테스트: 유저 A 토큰으로 유저 B 데이터 요청 → 403
- [ ] 알림: `next_water` 업데이트 → 로컬 알림 재스케줄
- [ ] 다크모드 / 액센트 / 폰트 prefs persist (profiles 테이블)
- [ ] 오프라인: 비행기 모드 → 앱 진입 시 캐시 노출, 쓰기 시도는 큐 (v1.5)

---

## 9. 지금 당장 실행할 것 (실제 태스크 목록)

우선순위 순:

1. **리포지토리 레이어 골격 만들기** — 섹션 3 의 체크리스트 중 이동 부분부터. 현재 `plantRepo.ts` 는 이미 80% 준비됨.
2. **ESLint no-restricted-imports 추가** — 더 이상 Supabase SDK 가 UI 코드에 새지 않도록 방어선 구축.
3. **도메인 타입 분리** — Supabase row 타입 (`PlantRow`) 이 리포지토리 바깥으로 절대 안 나가도록.
4. **`EXPO_PUBLIC_BACKEND` 환경변수 기반 팩토리** — 아직 AWS 구현 없어도 플립 스위치만 마련.
5. **Edge Function 카운트 유지** — Kakao 중계 외 새 Edge Function 은 무조건 한 번 더 고민.

---

## 10. 참고 — 갈아탈 때 짜게 될 Node.js 백엔드 스켈레톤

참고용 스케치. 실제 구현은 갈아타는 시점에.

```
backend/
  src/
    app.ts                  Express 앱 조립
    auth/
      jwt.ts                Cognito JWKS 검증 미들웨어
    db/
      prisma/schema.prisma  Supabase schema.sql 에서 prisma 로 재생성 (`npx prisma db pull`)
      prisma/client.ts
    routes/
      plants.ts             GET/POST/PATCH /api/plants[/:id]
      logs.ts
      locations.ts
      profiles.ts
    services/
      photos.ts             S3 pre-signed URL 발급
    realtime/
      socket.ts             Socket.io + Redis pub/sub (수평 확장 대비)
  Dockerfile
  ecosystem.config.js       PM2
```

배포는 EC2 + PM2 + Nginx + Let's Encrypt, 또는 ECS Fargate + ALB. Aurora Serverless v2 면 Lambda 랑 조합 가능해서 트래픽 낮을 때 EC2 보다 저렴.

---

## 요약 — "지금 한 줄로"

> **UI·스토어는 `src/repo/*` 만 호출하도록 지금부터 강제하면, 갈아타는 날엔 `src/repo/aws/*` 만 새로 쓰고 한 환경변수만 바꾸면 끝.**

현재 `plantRepo.ts` 의 리포지토리 시작점이 이미 있고, auth/storage/realtime 은 추가 작업 필요. 이 문서의 §3 체크리스트가 그 리팩토링 작업 그 자체.
