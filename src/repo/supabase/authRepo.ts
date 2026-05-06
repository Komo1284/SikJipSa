import type { AuthRepo } from '@/repo/contracts';
import type { AuthChangeEvent, OAuthProvider, Session, Unsubscribe } from '@/repo/types';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { hasSupabase, supabase } from './client';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

const toSession = (s: SupabaseSession | null): Session | null => {
  if (!s) return null;
  const u: User = s.user;
  return {
    userId: u.id,
    email: u.email ?? null,
    displayName:
      (u.user_metadata?.full_name as string) ??
      (u.user_metadata?.name as string) ??
      null,
    avatarUrl: (u.user_metadata?.avatar_url as string) ?? null,
    provider: (u.app_metadata?.provider as OAuthProvider) ?? 'anonymous',
  };
};

/**
 * Kakao Sign-In via the native SDK + a custom Edge Function bridge.
 *
 * We bypass Supabase's built-in Kakao provider because GoTrue hardcodes
 * `account_email` into the requested scopes, and our Kakao app can't enable
 * that consent item without 비즈 앱 (biz-app) registration. Instead:
 *
 *   1. Native Kakao SDK opens the KakaoTalk app (or web fallback) and returns
 *      an access_token. Scopes are controlled by what's enabled in the Kakao
 *      developer console — we have only profile_nickname / profile_image on.
 *   2. We POST that access_token to the `kakao-auth` Edge Function, which
 *      verifies the token, looks up or creates a Supabase user keyed off a
 *      phantom email (kakao_<id>@sikjipsa.local), and mints a magic-link
 *      token_hash.
 *   3. We exchange the token_hash for a real Supabase session via verifyOtp.
 */
async function performKakaoFlow(): Promise<Session> {
  if (!supabase) throw new Error('Supabase client not configured');

  const tokens = await kakaoLogin();
  if (!tokens?.accessToken) throw new Error('카카오 액세스 토큰을 받지 못했어요');

  const { data: bridge, error: bridgeErr } = await supabase.functions.invoke<{
    email: string;
    tokenHash: string;
  }>('kakao-auth', {
    body: { kakaoAccessToken: tokens.accessToken },
  });
  if (bridgeErr) throw bridgeErr;
  if (!bridge?.email || !bridge?.tokenHash) {
    throw new Error('카카오 인증 브릿지 응답 형식이 올바르지 않아요');
  }

  const { data: sessionData, error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: bridge.tokenHash,
  });
  if (verifyErr) throw verifyErr;

  const session = toSession(sessionData.session);
  if (!session) throw new Error('세션 생성 실패');
  return session;
}

/**
 * Google Sign-In via the native SDK (@react-native-google-signin/google-signin).
 *
 * Web Client IDs aren't allowed for native iOS/Android apps under Google's
 * OAuth 2.0 policy, so we use the iOS Client ID for the native consent screen,
 * grab the id_token (whose audience is the Web Client ID via webClientId), and
 * hand it to supabase.auth.signInWithIdToken.
 *
 * Prereqs:
 *  - Supabase dashboard → Authentication → Providers → Google → Client IDs
 *    must include both Web and iOS client IDs (comma-separated).
 *  - Supabase dashboard → Google provider → "Skip nonce check" must be ON
 *    (the native SDK doesn't surface a nonce we can pre-set).
 *  - app.json plugin "@react-native-google-signin/google-signin" with iosUrlScheme
 *    set to the reversed iOS client ID.
 */
async function performGoogleNativeFlow(): Promise<Session> {
  if (!supabase) throw new Error('Supabase client not configured');
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — add the Web OAuth client ID from Google Cloud Console',
    );
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error(`Google 로그인 취소 (${response.type})`);
  }

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('id_token 을 받지 못했어요');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  const session = toSession(data.session);
  if (!session) throw new Error('세션 생성 실패');
  return session;
}

export const supabaseAuthRepo: AuthRepo = {
  async getSession() {
    if (!hasSupabase || !supabase) return null;
    const { data } = await supabase.auth.getSession();
    return toSession(data.session);
  },

  async signInWithProvider(provider) {
    if (!hasSupabase || !supabase) {
      throw new Error(
        'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    if (provider === 'google') return performGoogleNativeFlow();
    if (provider === 'kakao') return performKakaoFlow();
    throw new Error(`${provider} 로그인은 지원하지 않아요`);
  },

  async sendEmailOtp(email) {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  },

  async verifyEmailOtp(email, token) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    const session = toSession(data.session);
    if (!session) throw new Error('세션 생성 실패');
    return session;
  },

  async signOut() {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(cb) {
    if (!hasSupabase || !supabase) return () => {};
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      const mapped: AuthChangeEvent =
        event === 'SIGNED_IN'
          ? 'SIGNED_IN'
          : event === 'SIGNED_OUT'
            ? 'SIGNED_OUT'
            : 'TOKEN_REFRESHED';
      cb(mapped, toSession(session));
    });
    const unsub: Unsubscribe = () => sub.data.subscription.unsubscribe();
    return unsub;
  },
};

/**
 * Call once near app startup so WebBrowser finalizes any in-progress auth
 * session after a cold-start deep link. Safe to call multiple times.
 */
export function maybeCompleteAuthSession() {
  WebBrowser.maybeCompleteAuthSession();
}
