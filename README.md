# SikJipSa — Expo App

`design_handoff_sikjipsa/prototype/` 에 있는 디자인 프로토타입을 Expo (React Native) + TypeScript + Supabase 로 재구현한 앱입니다.

## 스택

- **Runtime** — Expo SDK 52 / React Native 0.76 / React 18
- **Router** — Expo Router 4 (파일 기반, 타입드 루트)
- **State** — Zustand (persist 없이 간단하게; `AsyncStorage` 는 테마 prefs 에만 사용)
- **Backend** — Supabase (optional — `.env` 미설정 시 seed 로 폴백)
- **Icons** — `lucide-react-native`
- **Graphics** — `react-native-svg` (플레이스홀더 식물 일러스트)
- **Animation** — `react-native-reanimated` (물주기 버튼 ripple)
- **Fonts** — `@expo-google-fonts/{noto-sans-kr,instrument-serif,jetbrains-mono}`

## 셋업

```bash
cd sikjipsa-app
npm install          # 또는 pnpm install / yarn install

# Supabase 사용 시
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 채우기
# supabase/schema.sql 을 Supabase SQL Editor 에 붙여넣어 실행

npm start            # Expo dev server 시작
# i — iOS 시뮬레이터 / a — Android / w — 웹
```

`.env` 가 없으면 Supabase 클라이언트는 `null` 이 되고, 앱은 `src/data/plants.ts` 의 25개 시드로 동작합니다 — 바로 돌려볼 수 있어요.

## 디자인 토큰 — Single Source of Truth

`prototype/tokens.css` 의 CSS 변수를 `src/theme/tokens.ts` 에 1:1로 미러링했습니다. 두 파일의 키·값은 수동으로 동기화해야 합니다.

- `buildPalette(mode, accent)` — light/dark × green/sage/ochre/forest 조합을 만들어 줍니다.
- `radii / spacing / shadows / typography / fontFamilies` — 기하·타이포 토큰.
- `ThemeProvider` — 모드/액센트/폰트 prefs 를 `AsyncStorage` 에 persist, `useTheme()` 으로 소비.

RN 에서는 CSS 변수 캐스케이드가 없기 때문에, 컴포넌트는 모두 `const { palette } = useTheme()` 로 색을 읽습니다. 토큰이 바뀌면 RN/웹 양쪽에서 같은 값으로 맞춰 업데이트하세요.

## 디렉토리

```
sikjipsa-app/
  app/                       Expo Router entries
    _layout.tsx              루트 스택 + 폰트/테마 부트스트랩
    index.tsx                온보딩 (최초 진입 후 /tabs/home 으로 리다이렉트)
    (tabs)/
      _layout.tsx            커스텀 플로팅 탭바
      home.tsx               홈 대시보드
      list.tsx               내 식물 (그리드/리스트, 공간 칩 필터)
      schedule.tsx           D-day 버킷 일정
      me.tsx                 테마/액센트/폰트 설정
    plant/[id].tsx           식물 상세 (돌봄/환경/기록 탭)
    add.tsx                  3단계 식물 추가 (모달)
  src/
    components/              Typography, PlantThumb, WaterButton, Chip, TaskRow, GridCard, MiniPlantCard, SectionHeader, TabBar
    data/plants.ts           25종 시드 + 활동 로그 + 공간 메타
    lib/
      supabase.ts            supabase 클라이언트 (env 없으면 null)
      plantRepo.ts           fetch/upsert/insertLog (Supabase 없을 때 seed 반환)
    store/plants.ts          Zustand store — optimistic watering / fertilizing
    theme/
      tokens.ts              tokens.css 의 RN 미러
      ThemeProvider.tsx      React context + persist
    types/plant.ts           Plant / LogEntry 타입
    utils/date.ts            TODAY(2026-04-21), daysBetween, plantStatus 등
  supabase/schema.sql        plants + plant_logs 테이블 + RLS
```

## 스크린별 구현 노트

- **Onboarding (`app/index.tsx`)** — 배경 SVG, 큰 세리프 제목 + 이탤릭 색 포인트, 흑색 pill CTA. 한 번 넘기면 `AsyncStorage` 에 플래그를 남기고 다음 진입부터는 바로 `/tabs/home`.
- **Home** — 3카드 요약, 오늘 할 일 리스트, 곧 돌봐야 할 식물 가로 스크롤, 공간별 스택드 아바타.
- **List** — 그리드/리스트 토글, 검색 인풋, 공간 칩 (가로 스크롤) — 칩별 카운트 표시.
- **Plant Detail** — 히어로 이미지 + 그라디언트 오버레이, 스탯 3분할 카드 (오버랩), 빠른 액션 4개, 돌봄/환경/기록 3탭. 물주기/비료는 스토어의 optimistic update 로 즉시 반영.
- **Add** — 3 step wizard, 하단 고정 CTA. 완료 시 `addPlant` 가 시드 상단에 삽입됩니다.
- **Me** — 액센트/테마/폰트 토글 — 디자인 시스템 유연성을 인앱에서 직접 확인.

## 인터랙션

- **물주기 버튼** — 탭 시 Reanimated 로 scale (0.9 → 1.05 → 1) + ring ripple. 120ms 뒤 체크 아이콘으로 교체. 스토어는 즉시 `lastWater = now`, `nextWater = now + cycle` 로 업데이트하고 Supabase 호출이 있으면 백그라운드로 커밋. 실패 시 롤백.
- **탭바** — 플로팅 pill. 중앙의 `+` 버튼은 `translateY(-8)` + shadow-lg 로 튀어나오고, `/add` 모달을 열어요.
- **상세 → 리스트** — Expo Router 의 기본 slide_from_right.

## TODO / 범위 밖

- 인증 플로우 (Supabase auth) — RLS 정책은 이미 `auth.uid()` 기준으로 걸려 있음. 로그인 UI 붙이면 바로 동작.
- 사진 업로드 (Supabase Storage + `expo-image-picker`).
- `expo-notifications` 기반 물주기 리마인더 — 매일 09:00 로컬 푸시.
- 오프라인 우선 캐시 (MMKV 또는 SQLite). 현재는 인메모리.
- 진짜 달력 뷰 (현재 Schedule 은 D-day 버킷 리스트).

## tokens.css ↔ tokens.ts 동기화 규칙

CSS 값을 바꾸면 `src/theme/tokens.ts` 의 대응 키도 동일한 값으로 수정해 주세요. 컨벤션:

| CSS 변수 | TS 키 |
|---|---|
| `--bg` | `palette.bg` |
| `--surface-raised` | `palette.surfaceRaised` |
| `--ink-2` | `palette.ink2` |
| `--green-deep` | `palette.greenDeep` |
| `--r` | `radii.md` |
| `--shadow` | `shadows.md` |

액센트/테마 오버라이드도 `ACCENTS` 테이블에 1:1 로 옮겨져 있습니다.
