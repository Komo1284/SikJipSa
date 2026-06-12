import { SEED_LOG, SEED_PLANTS } from '@/data/plants';
import { cancelWaterReminder, rescheduleAll, scheduleWaterReminder } from '@/lib/notifications';
import { humanizeError } from '@/lib/errors';
import { enqueue, isOnline } from '@/lib/offlineQueue';
import { repos } from '@/repo';
import { hasSupabase } from '@/repo/supabase/client';
import { toast } from '@/store/toast';
import type { LogEntry, Plant } from '@/types/plant';
import { addDays, toISODate } from '@/utils/date';
import { create } from 'zustand';

/**
 * Wraps a write attempt: if we're known-offline OR the network call rejects
 * with a clearly transient error, queue it for later instead of rolling back.
 * UI keeps the optimistic update — store stays consistent.
 */
function isLikelyNetworkError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? '';
  return /network|fetch|timeout|connection|TypeError/i.test(msg);
}

type PlantStore = {
  plants: Plant[];
  log: LogEntry[];
  /**
   * `plantId → 가장 최근 분갈이 ISO 날짜`. 분갈이는 1년 이상 텀이 흔해서
   * `log` (60일 윈도우) 만으론 못 잡고, 별도 인덱스로 관리.
   */
  repotByPlant: Record<string, string>;
  loading: boolean;
  error: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  clear: () => void;
  waterPlant: (id: string, opts?: { date?: string; note?: string }) => Promise<void>;
  fertilizePlant: (id: string, opts?: { date?: string; note?: string }) => Promise<void>;
  addPlant: (p: Plant) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  updatePlant: (id: string, patch: Partial<Plant>) => Promise<void>;
  updatePlantPhoto: (id: string, photoUrl: string | null) => Promise<void>;
  logPhoto: (plantId: string, photoUrl: string, note?: string) => Promise<void>;
  logAction: (plantId: string, action: 'prune' | 'repot' | 'note', opts?: { date?: string; note?: string }) => Promise<void>;
  upsertPlantFromRealtime: (p: Plant) => void;
  removePlantFromRealtime: (id: string) => void;
  appendLogFromRealtime: (l: LogEntry) => void;
};

/**
 * When Supabase is wired (production path), the store starts empty and the
 * auth layout calls `load()` once a session is present.
 * Without Supabase (no .env), fall back to the 25-plant seed so the UI is
 * still explorable — useful for design review.
 */
const initialPlants = hasSupabase ? [] : SEED_PLANTS;
const initialLog = hasSupabase ? [] : SEED_LOG;

const buildRepotIndex = (logs: LogEntry[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const l of logs) {
    if (l.action !== 'repot') continue;
    const cur = out[l.plantId];
    if (!cur || l.date > cur) out[l.plantId] = l.date;
  }
  return out;
};

export const usePlantStore = create<PlantStore>((set, get) => ({
  plants: initialPlants,
  log: initialLog,
  repotByPlant: hasSupabase ? {} : buildRepotIndex(initialLog),
  loading: false,
  error: null,
  loaded: !hasSupabase,

  async load() {
    set({ loading: true, error: null });
    try {
      const [plants, log, repotByPlant] = await Promise.all([
        repos.plants.list(),
        repos.logs.listRecent(60),
        repos.logs.listLatestRepots(),
      ]);
      set({ plants, log, repotByPlant, loading: false, loaded: true });
      rescheduleAll(plants).catch(() => {}); // fire-and-forget
    } catch (e) {
      console.warn('[plantStore] load failed:', e);
      toast.error(`식물 불러오기 실패: ${humanizeError(e)}`);
      set({ loading: false, error: (e as Error).message });
    }
  },

  clear() {
    set({ plants: [], log: [], repotByPlant: {}, loaded: false, error: null });
  },

  async waterPlant(id, opts = {}) {
    const date = opts.date ?? toISODate(new Date());
    const note = opts.note ?? '';
    const plant = get().plants.find((p) => p.id === id);
    if (!plant) return;

    const nextWater = addDays(date, plant.waterCycle);
    const updated: Plant = { ...plant, lastWater: date, nextWater };
    const entry: LogEntry = { date, action: 'water', plantId: id, note };

    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? updated : p)),
      log: [entry, ...s.log],
    }));

    try {
      await Promise.all([
        repos.plants.update(id, { lastWater: date, nextWater }),
        repos.logs.insert(entry),
      ]);
      scheduleWaterReminder(updated).catch(() => {});
      // last_water moved → refresh the recommendation for this plant.
      import('@/store/weather').then(({ useWeatherStore }) =>
        useWeatherStore.getState().recompute([id]).catch(() => {}),
      );
    } catch (e) {
      console.warn('[plantStore] waterPlant failed:', e);
      if (!isOnline() || isLikelyNetworkError(e)) {
        enqueue({ kind: 'plant.update', id, patch: { lastWater: date, nextWater } });
        enqueue({ kind: 'log.insert', entry });
        scheduleWaterReminder(updated).catch(() => {});
        toast.info('오프라인 — 연결되면 자동 동기화돼요');
      } else {
        toast.error(`물주기 기록 실패: ${humanizeError(e)}`);
        set((s) => ({
          plants: s.plants.map((p) => (p.id === id ? plant : p)),
          log: s.log.filter(
            (l) => !(l.date === entry.date && l.plantId === id && l.action === 'water'),
          ),
          error: (e as Error).message,
        }));
      }
    }
  },

  async fertilizePlant(id, opts = {}) {
    const date = opts.date ?? toISODate(new Date());
    const note = opts.note ?? '';
    const plant = get().plants.find((p) => p.id === id);
    if (!plant) return;
    const updated: Plant = { ...plant, lastFert: date };
    const entry: LogEntry = { date, action: 'fert', plantId: id, note };

    set((s) => ({
      plants: s.plants.map((p) => (p.id === id ? updated : p)),
      log: [entry, ...s.log],
    }));

    try {
      await Promise.all([
        repos.plants.update(id, { lastFert: date }),
        repos.logs.insert(entry),
      ]);
    } catch (e) {
      console.warn('[plantStore] fertilizePlant failed:', e);
      toast.error(`비료 기록 실패: ${humanizeError(e)}`);
      set({ error: (e as Error).message });
    }
  },

  async addPlant(plant) {
    // Optimistic insert with a temp id — we'll swap for the DB-generated UUID.
    const tempId = plant.id;
    set((s) => ({ plants: [plant, ...s.plants] }));
    try {
      const saved = await repos.plants.create(plant);
      set((s) => ({
        plants: s.plants.map((p) => (p.id === tempId ? saved : p)),
      }));
      toast.success(
        `${plant.name} 추가됐어요. 비료·분갈이 주기 같은 자세한 정보는 상세 화면 ⋯ → "정보 수정" 에서 채워주세요.`,
        9000,
      );
      scheduleWaterReminder(saved).catch(() => {});
      import('@/store/weather').then(({ useWeatherStore }) =>
        useWeatherStore.getState().recompute([saved.id]).catch(() => {}),
      );
    } catch (e) {
      console.warn('[plantStore] addPlant failed:', e);
      toast.error(`식물 추가 실패: ${humanizeError(e)}`);
      set((s) => ({
        plants: s.plants.filter((p) => p.id !== tempId),
        error: (e as Error).message,
      }));
    }
  },

  async deletePlant(id) {
    const before = get().plants;
    const target = before.find((p) => p.id === id);
    if (!target) return;

    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) }));
    try {
      await repos.plants.softDelete(id);
      cancelWaterReminder(id).catch(() => {});
      toast.success(`${target.name} 삭제됨`);
    } catch (e) {
      console.warn('[plantStore] deletePlant failed:', e);
      toast.error(`삭제 실패: ${humanizeError(e)}`);
      set({ plants: before });
    }
  },

  upsertPlantFromRealtime(p) {
    set((s) => {
      const idx = s.plants.findIndex((x) => x.id === p.id);
      if (idx < 0) return { plants: [p, ...s.plants] };
      const next = [...s.plants];
      next[idx] = p;
      return { plants: next };
    });
  },

  removePlantFromRealtime(id) {
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) }));
  },

  appendLogFromRealtime(l) {
    set((s) => {
      const dup = s.log.find(
        (x) => x.plantId === l.plantId && x.date === l.date && x.action === l.action,
      );
      if (dup) return {};
      const next: Partial<PlantStore> = { log: [l, ...s.log] };
      if (l.action === 'repot') {
        const prev = s.repotByPlant[l.plantId];
        if (!prev || l.date > prev) {
          next.repotByPlant = { ...s.repotByPlant, [l.plantId]: l.date };
        }
      }
      return next;
    });
  },

  async updatePlant(id, patch) {
    const prev = get().plants.find((p) => p.id === id);
    if (!prev) return;

    const next: Plant = { ...prev, ...patch };
    // If watering cycle changed, recompute next_water based on last_water.
    if (patch.waterCycle !== undefined) {
      next.nextWater = addDays(next.lastWater, next.waterCycle);
    }

    set((s) => ({ plants: s.plants.map((p) => (p.id === id ? next : p)) }));
    try {
      const serverPatch: Partial<Plant> = { ...patch };
      if (patch.waterCycle !== undefined) serverPatch.nextWater = next.nextWater;
      const saved = await repos.plants.update(id, serverPatch);
      set((s) => ({ plants: s.plants.map((p) => (p.id === id ? saved : p)) }));
      scheduleWaterReminder(saved).catch(() => {});

      // If something that affects the recommendation changed, refresh just
      // this plant's recommended_next_water + reason immediately.
      const affectsRec =
        patch.waterCycle !== undefined ||
        patch.location !== undefined ||
        patch.lastWater !== undefined ||
        patch.speciesHumidityPref !== undefined ||
        patch.speciesLightPref !== undefined ||
        patch.light !== undefined ||
        patch.humidity !== undefined;
      if (affectsRec) {
        const { useWeatherStore } = await import('@/store/weather');
        await useWeatherStore.getState().recompute([id]);
      }

      toast.success('정보 수정됨');
    } catch (e) {
      console.warn('[plantStore] updatePlant failed:', e);
      toast.error(`수정 실패: ${humanizeError(e)}`);
      set((s) => ({ plants: s.plants.map((p) => (p.id === id ? prev : p)) }));
    }
  },

  async logAction(plantId, action, opts = {}) {
    const date = opts.date ?? toISODate(new Date());
    const note = opts.note ?? '';
    const entry: LogEntry = { plantId, action, date, note };
    set((s) => {
      const next: Partial<PlantStore> = { log: [entry, ...s.log] };
      if (action === 'repot') {
        const prev = s.repotByPlant[plantId];
        if (!prev || date > prev) {
          next.repotByPlant = { ...s.repotByPlant, [plantId]: date };
        }
      }
      return next;
    });
    try {
      await repos.logs.insert(entry);
      const labels: Record<typeof action, string> = { prune: '가지치기', repot: '분갈이', note: '메모' };
      toast.success(`${labels[action]} 기록됨`);
    } catch (e) {
      console.warn('[plantStore] logAction failed:', e);
      toast.error(`기록 실패: ${humanizeError(e)}`);
      set((s) => ({
        log: s.log.filter((l) => !(l.plantId === plantId && l.date === date && l.action === action)),
      }));
      // The repot index is rebuilt from `log` on next load anyway, so we don't
      // need to undo it explicitly. The optimistic write is harmless if the
      // user retries.
    }
  },

  async logPhoto(plantId, photoUrl, note = '') {
    const today = toISODate(new Date());
    const entry: LogEntry = { plantId, action: 'photo', date: today, note, photoUrl };
    set((s) => ({ log: [entry, ...s.log] }));
    try {
      await repos.logs.insert(entry);
      toast.success('사진 기록 추가됨');
    } catch (e) {
      console.warn('[plantStore] logPhoto failed:', e);
      toast.error(`사진 기록 실패: ${humanizeError(e)}`);
      set((s) => ({
        log: s.log.filter((l) => !(l.plantId === plantId && l.date === today && l.action === 'photo')),
      }));
    }
  },

  async updatePlantPhoto(id, photoUrl) {
    const plant = get().plants.find((p) => p.id === id);
    if (!plant) return;
    const prev = plant.photoUrl ?? null;
    set((s) => ({ plants: s.plants.map((p) => (p.id === id ? { ...p, photoUrl } : p)) }));
    try {
      await repos.plants.update(id, { photoUrl });
      // Also drop a photo log entry so the history timeline shows the swap
      // and keeps a trail of past cover photos.
      if (photoUrl) {
        const today = toISODate(new Date());
        const entry: LogEntry = { plantId: id, action: 'photo', date: today, note: '대표 사진 변경', photoUrl };
        set((s) => ({ log: [entry, ...s.log] }));
        repos.logs.insert(entry).catch(() => {});
      }
      toast.success('사진 변경됨');
    } catch (e) {
      console.warn('[plantStore] updatePlantPhoto failed:', e);
      toast.error(`사진 변경 실패: ${humanizeError(e)}`);
      set((s) => ({ plants: s.plants.map((p) => (p.id === id ? { ...p, photoUrl: prev } : p)) }));
    }
  },
}));
