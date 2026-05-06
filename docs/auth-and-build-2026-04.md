# 인증 + EAS 빌드 인프라 작업 기록 (2026-04-29 ~ 04-30)

다음 세션에서 이어가기 위한 작업 내역. 코드 자체는 git 으로 추적되니 여기는
**왜 그렇게 되었는가 + 콘솔 설정 + 외부 서비스 상태** 위주.

---

## 1. 결과 (현재 동작 상태)

- ✅ EAS Build 정상 (Apple Developer Program 활성, 프로젝트 ID `90004c30-1f1c-411a-8df0-79b8a2b9ad95`)
- ✅ Google 로그인 (네이티브 SDK)
- ✅ Kakao 로그인 (Supabase 우회 — Edge Function bridge)
- ✅ 라이트 splash + 라이트/다크 아이콘
- ⚠️ 다크 splash — `expo-splash-screen` plugin 으로 막 이전했고 빌드 후 검증 대기
- ⚠️ 기본 공간 1개 (거실) — 코드/스키마 반영 끝, 새 가입자에게만 적용 (기존 계정은 4개 그대로)

---

## 2. EAS / Apple Developer

- Expo 계정: `karan1284` (GitHub OAuth, 비밀번호 없음 → `EXPO_TOKEN` 으로 CLI 로그인)
- Apple Developer Program $99 결제 완료, 활성화됨
- Bundle ID: `com.sikjipsa.app` (iOS + Android 동일)
- `eas.json` 의 3개 프로필 (development / internal / production) 모두에 환경변수 4개 설정:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  - `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`
- 빌드 명령: `eas build --profile internal --platform ios`

---

## 3. Google 로그인 — 네이티브 SDK

### 변경 이력
1. 처음엔 `expo-auth-session` ID Token implicit flow + Web Client ID
2. → `code_challenge_method` PKCE 충돌 에러
3. → `usePKCE: false` 추가했더니 더 큰 정책 위반 에러
   ("You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy")
4. **공식 정책 확인**: Google 은 native iOS 앱에서 Web Client 사용 금지
5. → `@react-native-google-signin/google-signin` (네이티브 SDK) 로 전환

### 콘솔 설정
- **Google Cloud Console → 사용자 인증 정보**
  - Web Client ID: `1094704094747-qegtg4k9svvjapqv31jbdb880icme73t.apps.googleusercontent.com`
  - iOS Client ID: `1094704094747-in0ll3499v83v8o8apstf0oghmb0l7jp.apps.googleusercontent.com` (Bundle ID `com.sikjipsa.app`)
  - Reversed Client ID (iOS URL Scheme): `com.googleusercontent.apps.1094704094747-in0ll3499v83v8o8apstf0oghmb0l7jp`
- **Supabase → Authentication → Providers → Google**
  - Client IDs: Web + iOS 두 개를 쉼표로 구분해서 등록
  - **"Skip nonce check" 토글 ON** (네이티브 SDK 가 nonce 를 노출 안 해서 필수)

### 코드 위치
`src/repo/supabase/authRepo.ts` 의 `performGoogleNativeFlow()`. 흐름:
SDK `signIn()` → `idToken` 추출 → `supabase.auth.signInWithIdToken({ provider: 'google', token })`.

### app.json plugin
```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.1094704094747-in0ll3499v83v8o8apstf0oghmb0l7jp" }
]
```

---

## 4. Kakao 로그인 — Supabase 우회 + Edge Function bridge ⭐ 핵심 의사결정

### 왜 우회가 필요했나
- Supabase GoTrue 의 카카오 provider 는 default scope 에 `account_email` 을 **하드코딩**
  (소스: https://github.com/supabase/auth/blob/master/internal/api/provider/kakao.go)
- 클라이언트의 `options.scopes` 는 default 에 *append* 만 되고 **제거 불가**
- "Allow users without an email" 토글은 응답 처리 단계에만 영향, scope 전송에는 효과 없음
- 우리 카카오 앱은 `account_email` 동의항목이 "권한 없음" — 비즈 앱 등록 (사업자등록증 필요) 없이는 활성화 불가
- 결과: Supabase 통과하는 한 무조건 KOE205 (잘못된 요청) 발생

### 선택한 길: 옵션 B
1. `@react-native-seoul/kakao-login` 네이티브 SDK 로 카카오톡 앱 (또는 웹 fallback) 직접 호출
   - 우리가 scope 통제 → `profile_nickname`, `profile_image` 만
2. Supabase **Edge Function** (`supabase/functions/kakao-auth/index.ts`) 에서:
   - 카카오 access token 으로 `https://kapi.kakao.com/v2/user/me` 검증
   - phantom email `kakao_<id>@sikjipsa.local` 으로 사용자 lookup/create
   - `auth.admin.generateLink({ type: 'magiclink' })` 로 일회용 token_hash 발급
3. 클라이언트가 `verifyOtp({ token_hash, type: 'magiclink' })` 로 정식 Supabase 세션 획득

배포: `npx supabase functions deploy kakao-auth --no-verify-jwt` 끝남 (사용자가 익명 호출하므로 `--no-verify-jwt` 필수).

### 카카오 디벨로퍼스 콘솔 상태
- 앱 ID: `1444018` (앱 이름: SikJipSa)
- REST API 키: `b9dd85f0176dfb910f81dae6388914d7`
- 네이티브 앱 키: `c4a67adeae4c366973ccba084ba425e1`
- iOS 플랫폼 등록됨 (Bundle ID `com.sikjipsa.app`)
- Redirect URI: `https://slvizrcylcrdealuasua.supabase.co/auth/v1/callback` (이젠 안 쓰이지만 등록은 돼있음)
- 동의항목: 닉네임 = 필수, 프로필 사진 = 선택, 이메일 = 권한 없음
- 앱 아이콘 등록됨 (콘솔 측, 동의 화면용)

### 미래 작업 후보
- 비즈 앱 등록을 나중에 받게 되면, Edge Function 우회 빼고 Supabase 표준 카카오 provider 로 단순화 가능. 하지만 카카오톡 앱 점프 UX 는 네이티브 SDK 가 우월하므로 그대로 두는 게 더 좋을 수 있음.

---

## 5. UI / 데이터 변경

### 로그인 화면 (`app/index.tsx`)
- 이메일 OTP UI 완전 제거
- 카카오 (노란 #FEE500) + 구글 (네이티브 SDK 호출) 두 버튼
- per-provider 로딩 상태, 취소 메시지 alert 안 띄움
- 약관 안내 텍스트 하단

### Splash 스크린
- `expo-splash-screen` config plugin 으로 이전 (top-level `splash` 필드는 제거)
- light: `assets/splash.png` + bg `#F5F1EA`
- dark: `assets/splash-dark.png` + bg `#15181A`
- 1.8s 최소 표시 딜레이 (`app/_layout.tsx`)
- 자산 빌드 스크립트: `scripts/build-icons.sh` (rsvg-convert 또는 qlmanage)
- ⚠️ 다크 splash 가 실제로 동작하는지는 다음 빌드에서 확인 필요

### 기본 공간 시드
- 4개 (거실/침실/베란다/온실장) → **거실 1개** 만
- 변경: `src/store/locations.ts`, `src/repo/supabase/locationRepo.ts`, `supabase/schema.sql`
- DB 트리거 마이그레이션: `supabase/migration_007_default_location.sql` (기존 가입자 영향 없음, 새 가입자에게만 적용)

### Empty state
- `app/(tabs)/list.tsx` — 식물 0 개일 때 Sprout 아이콘 + "식물 추가하기" 버튼
- `app/(tabs)/schedule.tsx` — 0 개일 때 CalendarDays 아이콘 + 안내

---

## 6. 외부 서비스 자격증명 요약

| 서비스 | 핵심 ID/키 |
|---|---|
| Supabase 프로젝트 | `slvizrcylcrdealuasua` |
| Expo 프로젝트 ID | `90004c30-1f1c-411a-8df0-79b8a2b9ad95` |
| Google Web Client ID | `1094704094747-qegtg4k9...` |
| Google iOS Client ID | `1094704094747-in0ll349...` |
| Kakao 앱 ID | `1444018` |
| Kakao Native App Key | `c4a67adeae4c366973ccba084ba425e1` |
| Bundle ID | `com.sikjipsa.app` |

값은 `.env` + `eas.json` 에 모두 저장돼있음. `.env` 가 secret 이지만 anon key + public client ID 만 있어 노출돼도 위험 낮음.

---

## 7. 다음 세션에 이어가기 위한 컨텍스트

- 마지막 빌드 후 사용자 보고: Google 로그인 ✅, 카카오 로그인 ✅, 카카오 동의 화면 앱 아이콘 누락 → 카카오 콘솔에서 등록 끝
- 그 직후 추가 요청 3개를 모두 코드에 반영 + 다음 빌드 대기:
  1. 다크 splash 동작 (plugin 형식으로 이전)
  2. 기본 공간 1개로 축소
  3. 빈 list/schedule 탭 안내문구
- 다음 빌드: `eas build --profile internal --platform ios`
- DB 마이그레이션 적용 필요: `npx supabase db push` 또는 SQL editor 에서 `migration_007_default_location.sql` 직접 실행
