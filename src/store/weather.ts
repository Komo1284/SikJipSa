import { humanizeError } from '@/lib/errors';
import { detectIpLocation, detectLocation, getRecentWeather, loadPlace, savePlace } from '@/lib/weatherService';
import { recommendNextWater } from '@/lib/recommendation';
import { repos } from '@/repo';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { toast } from '@/store/toast';
import type { UserPlace, WeatherDay } from '@/types/plant';
import { toISODate } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

const LAST_RECOMPUTE_KEY = 'sikjipsa.recompute.lastDay.v1';
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
      '날씨 기반 물주기 추천',
      '내 위치의 기온·습도·강수량을 반영해 물주기 시점을 보정해드려요.\n위치를 어떻게 가져올까요?',
      [
        { text: 'GPS 사용 (정확)', onPress: () => resolve('gps') },
        { text: '대도시 추정 (대략)', onPress: () => resolve('ip') },
        { text: '나중에', style: 'cancel', onPress: () => resolve('skip') },
      ],
      { cancelable: true, onDismiss: () => resolve('skip') },
    );
  });
}

type WeatherStore = {
  place: UserPlace | null;
  weather: WeatherDay[];
  loading: boolean;
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
  recomputedToday: false,

  clear() {
    set({ place: null, weather: [], loading: false, recomputedToday: false });
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
      set({ weather });

      // 3) Recompute once per calendar day
      const last = await AsyncStorage.getItem(LAST_RECOMPUTE_KEY);
      const today = toISODate(new Date());
      if (last !== today) {
        await get().recompute();
        await AsyncStorage.setItem(LAST_RECOMPUTE_KEY, today);
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
        toast.error('위치를 가져오지 못했어요');
        set({ loading: false });
        return;
      }
      await savePlace(next);
      set({ place: next });
      const weather = await getRecentWeather(next);
      set({ weather });
      await get().recompute();
      toast.success(next.label ? `위치를 ${next.label} 으로 변경했어요` : '위치 변경됨');
    } catch (e) {
      console.warn('[weatherStore] relocate failed:', e);
      toast.error(`위치 변경 실패: ${humanizeError(e)} (기존 위치는 그대로 유지돼요)`);
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
