/**
 * Backend-agnostic types used across the repository layer.
 * UI/store code should only deal with these — never Supabase row types.
 */

export type OAuthProvider = 'google' | 'apple' | 'kakao';

export type Session = {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: OAuthProvider | 'anonymous';
};

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

export type Unsubscribe = () => void;

export type UploadResult = {
  path: string;
  publicUrl: string;
};
