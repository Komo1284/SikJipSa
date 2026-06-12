import { humanizeError } from '@/lib/errors';
import { repos } from '@/repo';
import { hasSupabase } from '@/repo/supabase/client';
import { usePlantStore } from '@/store/plants';
import { toast } from '@/store/toast';
import type { UserLocation } from '@/types/plant';
import { create } from 'zustand';

type LocationStore = {
  locations: UserLocation[];
  loaded: boolean;

  load: () => Promise<void>;
  clear: () => void;
  add: (input: { name: string; lightScore: number; airflowScore: number; weatherWeight?: number }) => Promise<void>;
  update: (id: string, patch: Partial<Pick<UserLocation, 'name' | 'lightScore' | 'airflowScore' | 'weatherWeight'>>) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const initial: UserLocation[] = hasSupabase
  ? []
  : [
      { id: '거실', name: '거실', sortOrder: 0, lightScore: 4, airflowScore: 4, weatherWeight: 0.4 },
    ];

export const useLocationStore = create<LocationStore>((set, get) => ({
  locations: initial,
  loaded: !hasSupabase,

  async load() {
    try {
      const locations = await repos.locations.list();
      set({ locations, loaded: true });
    } catch (e) {
      console.warn('[locationStore] load failed:', e);
      toast.error(`공간 불러오기 실패: ${humanizeError(e)}`, undefined, {
        label: '다시 시도',
        onPress: () => get().load(),
      });
    }
  },

  clear() {
    set({ locations: [], loaded: false });
  },

  async add(input) {
    try {
      const created = await repos.locations.create(input);
      set((s) => ({ locations: [...s.locations, created] }));
      toast.success(`${input.name} 공간 추가됨`);
    } catch (e) {
      console.warn('[locationStore] add failed:', e);
      toast.error(`공간 추가 실패: ${humanizeError(e)}`);
    }
  },

  async update(id, patch) {
    const prev = get().locations;
    const oldName = prev.find((l) => l.id === id)?.name;
    set((s) => ({ locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

    if (patch.name && oldName && oldName !== patch.name) {
      const ps = usePlantStore.getState();
      usePlantStore.setState({
        plants: ps.plants.map((p) => (p.location === oldName ? { ...p, location: patch.name! } : p)),
      });
    }

    // Trigger recompute IMMEDIATELY using the optimistic local state — that
    // way the user sees the new reason before the server round-trip lands,
    // and we avoid the race where a slow server response overwrites a fast
    // recompute from another concurrent change.
    const optimisticName = patch.name ?? prev.find((l) => l.id === id)?.name;
    if (optimisticName) {
      const affected = usePlantStore
        .getState()
        .plants.filter((p) => p.location === optimisticName)
        .map((p) => p.id);
      if (affected.length > 0) {
        const { useWeatherStore } = await import('@/store/weather');
        useWeatherStore.getState().recompute(affected).catch(() => {});
      }
    }

    try {
      const updated = await repos.locations.update(id, patch);
      set((s) => ({ locations: s.locations.map((l) => (l.id === id ? updated : l)) }));
      toast.success('공간 수정됨');
    } catch (e) {
      console.warn('[locationStore] update failed:', e);
      toast.error(`공간 수정 실패: ${humanizeError(e)}`);
      set({ locations: prev });
      usePlantStore.getState().load();
    }
  },

  async rename(id, name) {
    const prev = get().locations;
    const oldName = prev.find((l) => l.id === id)?.name;
    set((s) => ({ locations: s.locations.map((l) => (l.id === id ? { ...l, name } : l)) }));

    // Cascade in local plant store immediately so UI doesn't lag.
    if (oldName && oldName !== name) {
      const ps = usePlantStore.getState();
      const updated = ps.plants.map((p) => (p.location === oldName ? { ...p, location: name } : p));
      usePlantStore.setState({ plants: updated });
    }

    try {
      await repos.locations.rename(id, name);
      toast.success('공간 이름 변경됨');
    } catch (e) {
      console.warn('[locationStore] rename failed:', e);
      toast.error(`이름 변경 실패: ${humanizeError(e)}`);
      set({ locations: prev });
      // Re-fetch plants to undo any partial cascade.
      usePlantStore.getState().load();
    }
  },

  async remove(id) {
    const prev = get().locations;
    const removed = prev.find((l) => l.id === id);
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }));
    try {
      await repos.locations.remove(id);
      // Reassign any plants that pointed to the deleted name. Falling back
      // to the first remaining location (or empty string if none) so
      // filter chips don't stalk an orphaned name forever.
      if (removed) {
        const remaining = get().locations[0]?.name ?? '';
        const ps = usePlantStore.getState();
        const orphans = ps.plants.filter((p) => p.location === removed.name);
        for (const p of orphans) {
          // eslint-disable-next-line no-await-in-loop
          await ps.updatePlant(p.id, { location: remaining }).catch(() => {});
        }
      }
      toast.success('공간 삭제됨');
    } catch (e) {
      console.warn('[locationStore] remove failed:', e);
      toast.error(`공간 삭제 실패: ${humanizeError(e)}`);
      set({ locations: prev });
    }
  },
}));
