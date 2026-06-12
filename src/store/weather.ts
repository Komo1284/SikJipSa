import { humanizeError } from '@/lib/errors';
import { detectLocation, getRecentWeather, loadPlace, savePlace } from '@/lib/weatherService';
import { recommendNextWater } from '@/lib/recommendation';
import { repos } from '@/repo';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { toast } from '@/store/toast';
import type { UserPlace, WeatherDay } from '@/types/plant';
import { toISODate } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const LAST_RECOMPUTE_KEY = 'sikjipsa.recompute.lastDay.v1';

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
      // 1) Read existing profile place. If empty, this is first login → detect+save.
      let place = await loadPlace();
      if (!place || place.lat == null) {
        const detected = await detectLocation();
        if (detected.lat != null) {
          await savePlace(detected);
          place = detected;
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
      } else {
        next = await detectLocation();
        if (mode === 'ip') next = { ...next, source: 'ip' };
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
