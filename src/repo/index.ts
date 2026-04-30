import type { Repos } from './contracts';
import * as supabaseImpl from './supabase';

/**
 * Backend driver selector. Flip `EXPO_PUBLIC_BACKEND` to 'aws' once the
 * AWS implementation under src/repo/aws/ is ready. Everything in the app
 * should talk to this `repos` export — never import the concrete packages
 * (@supabase/supabase-js, @aws-amplify/*) directly from UI/store code.
 */
const driver = process.env.EXPO_PUBLIC_BACKEND ?? 'supabase';

export const repos: Repos =
  driver === 'aws'
    ? (() => { throw new Error('AWS repos not implemented yet'); })()
    : supabaseImpl.createRepos();

export type { Repos } from './contracts';
export type { AuthChangeEvent, OAuthProvider, Session, Unsubscribe, UploadResult } from './types';
