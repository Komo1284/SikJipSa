import { ToastHost } from '@/components/ToastHost';
import { DesktopShell } from '@/components/web/DesktopShell';
import { startQueue } from '@/lib/offlineQueue';
import { repos } from '@/repo';
import { maybeCompleteAuthSession } from '@/repo/supabase/authRepo';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useWeatherStore } from '@/store/weather';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import {
  NanumMyeongjo_400Regular,
  NanumMyeongjo_700Bold,
} from '@expo-google-fonts/nanum-myeongjo';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_600SemiBold,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {});
maybeCompleteAuthSession();
startQueue();

/**
 * Pushes the user to `/` (onboarding) when there's no session,
 * or to `/(tabs)/home` when they're signed in. Also drives the plant store's
 * lifecycle — load on sign-in, clear on sign-out — so UI never shows stale
 * data across accounts.
 */
function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { session, initialized } = useAuthStore();
  const loadPlants = usePlantStore((s) => s.load);
  const clearPlants = usePlantStore((s) => s.clear);
  const plantsLoaded = usePlantStore((s) => s.loaded);
  const loadLocations = useLocationStore((s) => s.load);
  const clearLocations = useLocationStore((s) => s.clear);

  useEffect(() => {
    if (!initialized) return;
    const top = segments[0];
    const inAuthArea = top === '(tabs)' || top === 'plant' || top === 'add';
    if (!session && inAuthArea) router.replace('/');
    else if (session && top === undefined) router.replace('/(tabs)/home');
  }, [session, initialized, segments, router]);

  useEffect(() => {
    if (!initialized) return;
    if (session && !plantsLoaded) {
      loadPlants();
      loadLocations();
    }
    if (!session && plantsLoaded) {
      clearPlants();
      clearLocations();
      useWeatherStore.getState().clear();
    }
  }, [session, initialized, plantsLoaded, loadPlants, clearPlants, loadLocations, clearLocations]);

  // Bootstrap location + weather once plants/locations are loaded.
  // This handles first-login (detects + saves place) and the daily recompute.
  useEffect(() => {
    if (!session || !plantsLoaded) return;
    useWeatherStore.getState().bootstrap();
  }, [session?.userId, plantsLoaded]);

  // Realtime: keep the store in sync when another device edits the same user's data.
  useEffect(() => {
    if (!session) return;
    const { upsertPlantFromRealtime, removePlantFromRealtime, appendLogFromRealtime } = usePlantStore.getState();
    const unsubPlants = repos.realtime.subscribeToPlants(session.userId, (event) => {
      if (event.kind === 'upsert') upsertPlantFromRealtime(event.plant);
      else removePlantFromRealtime(event.id);
    });
    const unsubLogs = repos.realtime.subscribeToLogs(session.userId, appendLogFromRealtime);
    return () => { unsubPlants(); unsubLogs(); };
  }, [session?.userId]);
}

function RootStack() {
  const { palette, resolved, syncFromServer } = useTheme();
  const { isDesktop } = useResponsive();
  const segments = useSegments();
  const initAuth = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);

  useEffect(() => { initAuth(); }, [initAuth]);
  useAuthGuard();

  // Pull theme prefs from the server once the user signs in. Local wins during
  // the brief window before the remote row arrives.
  useEffect(() => {
    if (session) syncFromServer();
  }, [session?.userId]);

  const top = segments[0] as string | undefined;
  // Persistent left sidebar only for signed-in surfaces on desktop.
  const useShell = isDesktop && top !== undefined && top !== 'add';

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg },
        animation: isDesktop ? 'none' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="plant/[id]" />
      <Stack.Screen
        name="plant/edit/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          presentation: isDesktop ? 'transparentModal' : 'modal',
          animation: isDesktop ? 'fade' : 'slide_from_bottom',
        }}
      />
    </Stack>
  );

  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {useShell ? <DesktopShell>{stack}</DesktopShell> : stack}
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    GowunDodum_400Regular,
    NanumMyeongjo_400Regular,
    NanumMyeongjo_700Bold,
  });

  // Hold the splash for at least ~1.8s even when fonts load instantly,
  // otherwise it flashes for a few hundred ms on fast devices and feels broken.
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDelayPassed(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loaded && minDelayPassed) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, minDelayPassed]);

  if (!loaded || !minDelayPassed) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
