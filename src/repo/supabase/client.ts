import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client — only imported inside src/repo/supabase/*.
 * UI/store code must NEVER import this directly; use `src/repo` instead.
 * When env vars are missing, the client is null and repo implementations
 * fall back to local seed data so the app is still explorable offline.
 */
export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // Implicit flow — tokens arrive in the redirect URL fragment (#access_token=...).
          // We tried PKCE first but RN's missing WebCrypto makes Supabase fall back to
          // the Site URL on callback. Implicit is simpler and reliable in Expo Go.
          flowType: 'implicit',
        },
      })
    : null;

export const hasSupabase = supabase !== null;
