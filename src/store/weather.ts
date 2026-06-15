import i18n from '@/i18n';
import { humanizeError } from '@/lib/errors';
import { detectIpLocation, detectLocation, getRecentWeather, loadPlace, savePlace } from '@/lib/weatherService';
import { recommendNextWater } from '@/lib/recommendation';
import { repos } from '@/repo';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { toast } from '@/store/toast';
import type { UserPlace, WeatherDay } from '@/types/plant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

const LAST_RECOMPUTE_KEY = 'sikjipsa.recompute.lastTs.v2';
const RECOMPUTE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 하루 1회 → 12시간마다
const LOCATION_PROMPT_DISMISSED_KEY = 'sikjipsa.locationPrompt.dismissed.v1';

/**
 * 첫 로그인에서 OS GPS 권한 팝업이 아무 설명 없이 튀어나오던 것을,
 * 왜 위치가 필요한지 먼저 알려주는 다이얼로그로 감싼다. '나중에'를
 * 고르면 다시 묻지 않고(영구 기록), Me 탭에서 언제든 설정할 수 있다.
 * 웹은 RN Alert 가 동작하지 않으므로 브라우저 권한 팝업에 그대로 맡긴다.
 */
function askLocationConsent(): Promise<'gps' | 'ip' | 'skip'> {
  if (Platform.OS === 'web') return Promise.resolve('gps');
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('stores.locationConsentTitle'),
      i18n.t('stores.locationConsentMessage'),
      [
        { text: i18n.t('stores.locationConsentGps'), onPress: () => resolve('gps') },
        { text: i18n.t('stores.locationConsentIp'), onPress: () => resolve('ip') },
        { text: i18n.t('stores.locationConsentLater'), style: 'cancel', onPress: () => resolve('skip') },
      ],
      { cancelable: true, onDismiss: () => resolve('skip') },
    );
  });
}

type WeatherStore = {
  place: UserPlace | null;
  weather: WeatherDay[];
  loading: boolean;
  /** 마지막으로 날씨를 가져온 시각(ms) — Me 탭 신선도 표시용. */
  lastUpdated: number | null;
  /** Has the daily recompute already run for today? */
  recomputedToday: boolean;

  /** First-login bootstrap: detect location, persist, fetch weather, recompute. */
  bootstrap: () => Promise<void>;

  /** Reset on signout / account switch. */
  clear: () => void;

  /** Manual relocate from Me tab. `mode='gps'|'ip'|'manual'` */
  relocate: (mode: 'gps' | 'ip' | 'manual', manual?: { lat: number; lng: number; label: string }) => Promise<void>;

  /** Re-run the recommendation pass. Pass `plantIds` to limit to specific
   *  plants (used after a plant edit / location-environment change so only
   *  the affected entries get a server round-trip). */
  recompute: (plantIds?: string[]) => Promise<void>;
};

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  place: null,
  weather: [],
  loading: false,
  lastUpdated: null,
  recomputedToday: false,

  clear() {
    set({ place: null, weather: [], loading: false, lastUpdated: null, recomputedToday: false });
  },

  async bootstrap() {
    // Bail if there's no signed-in session — prevents in-flight savePlace
    // from racing with signout and blowing up on RLS.
    const { useAuthStore } = await import('@/store/auth');
    if (!useAuthStore.getState().session) return;

    set({ loading: true });
    try {
      // 1) Read existing profile place. If empty, this is first login → ask
      //    for consent first, then detect+save. '나중에' is remembered so the
      //    dialog doesn't nag on every launch.
      let place = await loadPlace();
      if (!place || place.lat == null) {
        const dismissed = await AsyncStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY);
        if (!dismissed) {
          const choice = await askLocationConsent();
          if (choice === 'skip') {
            await AsyncStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, '1');
          } else {
            const detected = choice === 'ip' ? await detectIpLocation() : await detectLocation();
            if (detected.lat != null) {
              await savePlace(detected);
              place = detected;
            }
          }
        }
      }
      set({ place: place ?? null });

      if (!place || place.lat == null) {
        set({ loading: false });
        return;
      }

      // 2) Fetch / read cached weather
      const weather = await getRecentWeather(place);
      set({ weather, lastUpdated: weather.length > 0 ? Date.now() : get().lastUpdated });

      // 3) Recompute every 12h — 하루 1회였을 땐 오후에 날씨가 급변해도
      //    다음 날까지 추천이 낡은 채로 남았다.
      const last = Number(await AsyncStorage.getItem(LAST_RECOMPUTE_KEY)) || 0;
      if (Date.now() - last > RECOMPUTE_INTERVAL_MS) {
        await get().recompute();
        await AsyncStorage.setItem(LAST_RECOMPUTE_KEY, String(Date.now()));
      }
      set({ recomputedToday: true, loading: false });
    } catch (e) {
      console.warn('[weatherStore] bootstrap failed:', e);
      set({ loading: false });
    }
  },

  async relocate(mode, manual) {
    set({ loading: true });
    try {
      let next: UserPlace | null = null;
      if (mode === 'manual' && manual) {
        next = { lat: manual.lat, lng: manual.lng, label: manual.label, source: 'manual' };
      } else if (mode === 'ip') {
        // IP 모드인데 detectLocation() 을 타면 GPS 권한 팝업이 떠버린다 —
        // 사용자가 일부러 '대략 추정'을 골랐으니 IP 경로만 사용.
        next = await detectIpLocation();
      } else {
        next = await detectLocation();
      }
      if (!next || next.lat == null) {
        toast.error(i18n.t('stores.locationFetchFailed'));
        set({ loading: false });
        return;
      }
      await savePlace(next);
      set({ place: next });
      const weather = await getRecentWeather(next);
      set({ weather, lastUpdated: weather.length > 0 ? Date.now() : get().lastUpdated });
      await get().recompute();
      toast.success(next.label ? i18n.t('stores.locationChangedTo', { label: next.label }) : i18n.t('stores.locationChanged'));
    } catch (e) {
      console.warn('[weatherStore] relocate failed:', e);
      toast.error(i18n.t('stores.locationChangeFailed', { error: humanizeError(e) }));
    } finally {
      set({ loading: false });
    }
  },

  async recompute(plantIds) {
    const { weather } = get();
    // NOTE: do NOT early-return on empty weather. Even with no location/
    // weather data, location.airflowScore + plant.speciesLightPref still
    // affect the recommendation, so a user who toggles 환기 from 1→5 must
    // see the "환기가 약한 공간" phrase disappear immediately.
    const allPlants = usePlantStore.getState().plants;
    const plants = plantIds ? allPlants.filter((p) => plantIds.includes(p.id)) : allPlants;
    const locations = useLocationStore.getState().locations;

    // Recompute is silent — we hit the repo directly so the user-facing
    // updatePlant toast doesn't fire N times.
    for (const plant of plants) {
      const loc = locations.find((l) => l.name === plant.location) ?? null;
      const rec = recommendNextWater(plant, loc, weather);
      if (
        plant.recommendedNextWater === rec.date &&
        plant.recommendationDelta === rec.delta &&
        plant.recommendationReason === rec.reason
      ) continue;

      const patch = {
        recommendedNextWater: rec.date,
        recommendationReason: rec.reason,
        recommendationDelta: rec.delta,
      };
      // Optimistic local update.
      usePlantStore.setState((s) => ({
        plants: s.plants.map((p) => (p.id === plant.id ? { ...p, ...patch } : p)),
      }));
      // eslint-disable-next-line no-await-in-loop
      await repos.plants.update(plant.id, patch).catch((e) => {
        console.warn('[weatherStore] recompute persist failed:', e);
      });
    }
  },
}));
