import { repos } from '@/repo';
import type { OAuthProvider, Session } from '@/repo/types';
import { create } from 'zustand';

type AuthStore = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  init: () => Promise<void>;
  signIn: (provider: OAuthProvider) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 계정 영구 삭제 — 성공 시 세션이 비워지고 useAuthGuard 가 온보딩으로 보낸다. */
  deleteAccount: () => Promise<void>;
  _applySession: (s: Session | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: false,
  error: null,
  initialized: false,

  async init() {
    try {
      const session = await repos.auth.getSession();
      set({ session, initialized: true });

      // Keep store in sync when tokens refresh / user signs out from elsewhere.
      repos.auth.onAuthStateChange((_event, s) => {
        set({ session: s });
      });
    } catch (e) {
      set({ error: (e as Error).message, initialized: true });
    }
  },

  async signIn(provider) {
    set({ loading: true, error: null });
    try {
      const session = await repos.auth.signInWithProvider(provider);
      set({ session, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async sendEmailOtp(email) {
    set({ loading: true, error: null });
    try {
      await repos.auth.sendEmailOtp(email);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async verifyEmailOtp(email, token) {
    set({ loading: true, error: null });
    try {
      const session = await repos.auth.verifyEmailOtp(email, token);
      set({ session, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async signOut() {
    try {
      await repos.auth.signOut();
      set({ session: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async deleteAccount() {
    set({ loading: true, error: null });
    try {
      await repos.auth.deleteAccount();
      set({ session: null, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  _applySession(session) {
    set({ session });
  },
}));
