import { repos } from '@/repo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  AccentKey, FontKey, Palette, ThemeMode,
  buildPalette, fontFamilies, fontWeights, radii, shadows, spacing, typography,
} from './tokens';

type ThemePrefs = {
  mode: ThemeMode | 'system';
  accent: AccentKey;
  font: FontKey;
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ThemeMode;
  accent: AccentKey;
  font: FontKey;
  palette: Palette;
  fonts: typeof fontFamilies[FontKey];
  weights: typeof fontWeights;
  radii: typeof radii;
  spacing: typeof spacing;
  shadows: typeof shadows;
  typography: typeof typography;
  setMode: (m: ThemeMode | 'system') => void;
  setAccent: (a: AccentKey) => void;
  setFont: (f: FontKey) => void;
  syncFromServer: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'sikjipsa.theme.v1';

const DEFAULTS: ThemePrefs = { mode: 'system', accent: 'green', font: 'pretendard' };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
    // Mirror to Supabase profile — fire-and-forget; failures won't revert UI.
    repos.profile
      .update({ theme: prefs.mode, accent: prefs.accent, font: prefs.font })
      .catch(() => {});
  }, [prefs, hydrated]);

  /**
   * One-shot hydration from the server after sign-in: if the remote prefs
   * differ from local, apply them. No-op when Supabase isn't configured.
   * Exposed via the context as `syncFromServer()` so the auth guard can call
   * it after a fresh session arrives.
   */
  const syncFromServer = async () => {
    try {
      const remote = await repos.profile.get();
      if (!remote) return;
      setPrefs((p) => ({
        mode: remote.theme,
        accent: remote.accent,
        font: remote.font,
      }));
    } catch {
      /* ignore — local prefs are the fallback */
    }
  };

  const resolved: ThemeMode = prefs.mode === 'system' ? ((system ?? 'light') as ThemeMode) : prefs.mode;

  const value = useMemo<ThemeContextValue>(() => ({
    mode: prefs.mode === 'system' ? resolved : prefs.mode,
    resolved,
    accent: prefs.accent,
    font: prefs.font,
    palette: buildPalette(resolved, prefs.accent),
    fonts: fontFamilies[prefs.font],
    weights: fontWeights,
    radii, spacing, shadows, typography,
    setMode: (mode) => setPrefs((p) => ({ ...p, mode })),
    setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
    setFont: (font) => setPrefs((p) => ({ ...p, font })),
    syncFromServer,
  }), [prefs, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
