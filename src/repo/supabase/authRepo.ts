import type { AuthRepo } from '@/repo/contracts';
import type { AuthChangeEvent, OAuthProvider, Session, Unsubscribe } from '@/repo/types';
import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { hasSupabase, supabase } from './client';

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

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Google Web OAuth client ID — from Google Cloud Console → 사용자 인증 정보.
 * Also reused as the "audience" for Supabase's signInWithIdToken call.
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/**
 * We run the Google consent screen ourselves via expo-auth-session, grab an
 * id_token, and hand it to supabase.auth.signInWithIdToken. This bypasses
 * Supabase's OAuth redirect flow entirely — no state cookies to validate,
 * no Site URL fallback, no "localhost" dead-end.
 */
/**
 * Kakao OAuth via Supabase's hosted redirect flow.
 * Kakao doesn't issue an id_token by default, so we can't reuse the Google
 * ID-token shortcut. Instead: ask Supabase for the Kakao authorize URL, open
 * it in an in-app browser, and let Supabase's callback bounce back to the
 * app's `sikjipsa://` scheme with tokens in the URL fragment (implicit flow).
 *
 * Prereqs:
 *  - Supabase dashboard → Authentication → Providers → Kakao enabled with
 *    REST API key + Client Secret from Kakao developers console.
 *  - Supabase dashboard → Authentication → URL Configuration → Redirect URLs
 *    must include `sikjipsa://**` so the bounce-back lands on the app.
 *  - Kakao developers → 플랫폼 키 → REST API 키 → 리다이렉트 URI must include
 *    `https://<project>.supabase.co/auth/v1/callback`.
 */
async function performKakaoFlow(): Promise<Session> {
  if (!supabase) throw new Error('Supabase client not configured');

  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'sikjipsa' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Kakao OAuth URL 을 받지 못했어요');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  console.log('[authRepo] Kakao auth result.type =', result.type);

  if (result.type !== 'success' || !result.url) {
    throw new Error(`Kakao 로그인 취소 (${result.type})`);
  }

  // Implicit flow: tokens are in the URL fragment (#access_token=…&refresh_token=…).
  const fragment = result.url.split('#')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    throw new Error('Kakao 토큰을 받지 못했어요');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;

  const session = toSession(sessionData.session);
  if (!session) throw new Error('세션 생성 실패');
  return session;
}

async function performGoogleIdTokenFlow(): Promise<Session> {
  if (!supabase) throw new Error('Supabase client not configured');
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env — add the OAuth Web client ID from Google Cloud Console',
    );
  }

  const redirectUri = AuthSession.makeRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    extraParams: { nonce: 'sikjipsa-nonce' },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  console.log('[authRepo] Google auth result.type =', result.type);

  if (result.type !== 'success') {
    throw new Error(`Google 로그인 취소 (${result.type})`);
  }

  const idToken = result.params.id_token;
  if (!idToken) throw new Error('id_token 을 받지 못했어요');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: 'sikjipsa-nonce',
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
    if (provider === 'google') return performGoogleIdTokenFlow();
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
